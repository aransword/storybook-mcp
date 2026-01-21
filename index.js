#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer from "puppeteer";

const STORYBOOK_URL = process.env.STORYBOOK_URL;

if (!STORYBOOK_URL) {
  console.error("❌ 오류: STORYBOOK_URL 환경 변수가 설정되지 않았습니다.");
  process.exit(1);
}

const server = new Server(
  {
    name: "storybook-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. 도구 목록 정의 (3개의 도구)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_storybook_components",
        description: "Storybook에서 유효한 컴포넌트 목록과 각 컴포넌트가 보유한 스토리(Stories) ID 목록을 조회합니다.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "analyze_storybook_props",
        description: "특정 컴포넌트의 Docs 페이지에서 Props(Args) 테이블 정보를 상세히 추출합니다.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "분석할 Storybook Docs 페이지의 URL" },
          },
          required: ["url"],
        },
      },
      {
        name: "extract_component_stories",
        description: "컴포넌트의 Docs 페이지에 포함된 모든 스토리 예제의 이름과 실제 소스 코드를 추출합니다.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "분석할 Storybook Docs 페이지의 URL" },
          },
          required: ["url"],
        },
      },
    ],
  };
});

// 2. 도구 실행 로직
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const baseUrl = STORYBOOK_URL.replace(/\/$/, "");

  // [Tool 1] 목록 조회
  if (request.params.name === "list_storybook_components") {
    try {
      let data;
      try {
        const response = await fetch(`${baseUrl}/index.json`);
        if (!response.ok) throw new Error();
        data = await response.json();
      } catch (e) {
        const response = await fetch(`${baseUrl}/stories.json`);
        data = await response.json();
      }

      const entries = Object.values(data.entries || data.stories);
      const componentGroups = {};
      
      entries.forEach(entry => {
        if (!componentGroups[entry.title]) {
          componentGroups[entry.title] = { title: entry.title, stories: [], docsId: null };
        }
        if (entry.type === 'story') {
          componentGroups[entry.title].stories.push({ name: entry.name, id: entry.id });
        }
        if (entry.type === 'docs' || (entry.tags && entry.tags.includes('docs'))) {
          componentGroups[entry.title].docsId = entry.id;
        }
      });

      const componentList = Object.values(componentGroups)
        .filter(group => group.stories.length > 0)
        .map(group => ({
          name: group.title,
          hasDocs: !!group.docsId,
          url: `${baseUrl}/?path=/${group.docsId ? 'docs' : 'story'}/${group.docsId || group.stories[0].id}`,
          availableStories: group.stories.map(s => s.name)
        }));

      return {
        content: [{ type: "text", text: JSON.stringify({ configUrl: baseUrl, components: componentList }, null, 2) }],
      };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `목록 실패: ${error.message}` }] };
    }
  }

  // [Tool 2] Props 분석 (기존 성공 로직 보존)
  if (request.params.name === "analyze_storybook_props") {
    const { url } = request.params.arguments;
    let browser;
    try {
      browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      let targetFrame;
      try {
        const iframeElement = await page.waitForSelector('#storybook-preview-iframe', { timeout: 10000 });
        targetFrame = await iframeElement.contentFrame();
      } catch (e) { targetFrame = page; }

      try {
        await targetFrame.waitForSelector('.docblock-argstable tbody tr', { timeout: 10000 });
      } catch (e) { }

      const result = await targetFrame.evaluate(() => {
        const title = document.querySelector('.sbdocs-title')?.innerText || "Unknown";
        const props = [];
        const tables = document.querySelectorAll('.docblock-argstable');
        tables.forEach(table => {
          table.querySelectorAll('tbody tr').forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length >= 3) {
              const name = cells[0].innerText.replace(/\*/g, '').trim();
              if (['propertyname', 'name'].includes(name.toLowerCase())) return;
              props.push({
                name,
                description: cells[1].innerText.trim(),
                defaultValue: cells[2].innerText.trim()
              });
            }
          });
        });
        return { component: title, props };
      });

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `분석 실패: ${error.message}` }] };
    } finally { if (browser) await browser.close(); }
  }

  // [Tool 3] 스토리 소스 코드 추출 (최종 강화 버전)
  if (request.params.name === "extract_component_stories") {
    const { url } = request.params.arguments;
    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: "new", 
        args: ["--no-sandbox", "--disable-setuid-sandbox"] 
      });
      const page = await browser.newPage();
      
      // 1. 페이지 접속 (네트워크가 어느 정도 안정될 때까지 대기)
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      let targetFrame;
      const iframeElement = await page.waitForSelector('#storybook-preview-iframe', { timeout: 10000 });
      targetFrame = await iframeElement.contentFrame();

      // 2. [중요] 스토리 섹션 자체가 나타날 때까지 대기 (이게 없으면 0건이 나옵니다)
      await targetFrame.waitForSelector('.sb-anchor, .sbdocs-preview', { timeout: 10000 });

      // 3. "Show code" 버튼 모두 클릭
      await targetFrame.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button')).filter(b => 
          b.innerText.toLowerCase().includes('show code') || 
          b.classList.contains('docblock-code-toggle')
        );
        buttons.forEach(btn => btn.click());
      });

      // 4. 코드가 렌더링될 시간을 넉넉히 확보 (2초)
      await new Promise(r => setTimeout(r, 2000));

      const stories = await targetFrame.evaluate(() => {
        const results = [];
        // 스토리별 앵커 포인트를 기준으로 루프를 돕니다.
        const anchors = document.querySelectorAll('.sb-anchor');
        
        anchors.forEach(anchor => {
          // A. 이름 찾기 (h3, h2를 먼저 찾고 없으면 ID에서 추출)
          const titleEl = anchor.querySelector('h3, h2');
          let name = titleEl ? titleEl.innerText.trim() : "";
          
          if (!name && anchor.id) {
            // anchor--example-button--primary -> Primary 형태로 변환
            const parts = anchor.id.split('--');
            const rawName = parts[parts.length - 1];
            name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          }

          // B. 코드 블록 찾기 (pre, code, 또는 docblock-source 클래스)
          const codeEl = anchor.querySelector('.docblock-source, pre, code');
          if (codeEl) {
            const code = codeEl.innerText.trim();
            
            // "Show code" 텍스트만 긁히거나 빈 경우 제외
            if (code && !code.toLowerCase().includes('show code')) {
              results.push({
                name: name || "Story",
                code: code
              });
            }
          }
        });
        
        return results;
      });

      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ total: stories.length, stories }, null, 2) 
        }] 
      };
    } catch (error) {
      return { 
        isError: true, 
        content: [{ type: "text", text: `코드 추출 실패: ${error.message}` }] 
      };
    } finally { 
      if (browser) await browser.close(); 
    }
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Storybook MCP Server running on stdio");
}

run().catch(e => process.exit(1));