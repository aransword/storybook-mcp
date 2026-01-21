import puppeteer from "puppeteer";

// 테스트할 로컬 Storybook URL
const TARGET_URL = "http://localhost:6006/?path=/docs/example-button--docs";

async function scrapeStorybook() {
  console.log(`🌐 로컬 Storybook 접속 중... \n👉 ${TARGET_URL}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    
    // 1. 페이지 접속
    await page.goto(TARGET_URL, { waitUntil: "networkidle0", timeout: 30000 });

    // 2. Iframe 찾기
    console.log("⏳ Iframe 로딩 대기 중...");
    const iframeElement = await page.waitForSelector('#storybook-preview-iframe', { timeout: 10000 });
    
    if (!iframeElement) throw new Error("Storybook Iframe을 찾을 수 없습니다.");

    // 3. Iframe 내부 진입
    const frame = await iframeElement.contentFrame();
    console.log("🔍 Iframe 진입 성공. 모든 테이블 탐색 시작...");
    
    // 테이블이 렌더링될 때까지 잠시 대기
    try {
      await frame.waitForSelector('.sb-argstableBlock, table', { timeout: 5000 });
    } catch (e) {
      console.log("⚠️ 테이블 선택자를 찾지 못했습니다. (데이터가 없을 수도 있음)");
    }

    // 4. 데이터 추출 및 검증 (모든 테이블 순회)
    const result = await frame.evaluate(() => {
      const titleEl = document.querySelector('.sbdocs-title') || document.querySelector('h1');
      const componentName = titleEl ? titleEl.innerText : "Unknown Component";

      // [핵심 변경] querySelectorAll로 모든 테이블을 가져옵니다.
      const tables = document.querySelectorAll('.sb-argstableBlock, table');
      
      const logs = [];
      const validProps = [];
      const seenNames = new Set(); // 중복 방지용

      if (tables.length === 0) {
        return { componentName, props: [], logs: ["❌ 발견된 테이블이 없습니다."] };
      }

      logs.push(`🔍 총 ${tables.length}개의 테이블을 발견했습니다.`);

      // 각 테이블을 순회하며 데이터 수집
      tables.forEach((table, tableIndex) => {
        logs.push(`\n[Table #${tableIndex + 1}] 분석 시작...`);
        
        const rows = table.querySelectorAll('tbody tr');
        let validCountInTable = 0;

        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('td'));
          
          if (cells.length >= 3) {
            let name = cells[0]?.innerText || "";
            name = name.replace(/\*/g, '').trim(); // 별표 제거

            const description = cells[1]?.innerText?.trim() || "";
            const defaultValue = cells[2]?.innerText?.trim() || "-";
            const lowerName = name.toLowerCase();

            // --- 🔍 필터링 로직 ---
            
            // 1. 이름 체크
            if (!name) {
              return; // 이름 없으면 조용히 패스
            }

            // 2. 더미 이름 체크
            const garbageNames = ['propertyname', 'name', 'args', 'unknown', 'arguments'];
            if (garbageNames.includes(lowerName)) {
              logs.push(`  ❌ Row ${rowIndex + 1}: 삭제됨 (더미 이름: "${name}")`);
              return;
            }

            // 3. 더미 기본값 체크
            if (defaultValue === 'defaultValue') {
              logs.push(`  ❌ Row ${rowIndex + 1}: 삭제됨 (더미 기본값: "${name}")`);
              return;
            }

            // 4. 중복 체크
            if (seenNames.has(name)) {
              logs.push(`  ⚠️ Row ${rowIndex + 1}: 중복 제외 ("${name}")`);
              return;
            }

            // ✅ 통과
            validProps.push({ name, description, defaultValue });
            seenNames.add(name);
            validCountInTable++;
          }
        });

        if (validCountInTable === 0) {
          logs.push(`  👉 결과: 이 테이블에서는 유효한 데이터가 0건입니다. (전체 더미 테이블 추정)`);
        } else {
          logs.push(`  👉 결과: ${validCountInTable}건의 유효한 데이터 추출됨.`);
        }
      });

      return { componentName, props: validProps, logs };
    });

    // --- 결과 출력 ---
    console.log("\n------------------------------------------------");
    console.log(`📦 Component: ${result.componentName}`);
    console.log("------------------------------------------------");
    
    console.log("\n📜 [분석 로그]");
    result.logs.forEach(log => console.log(log));

    console.log("\n✅ [최종 추출 결과]");
    if (result.props.length > 0) {
        console.log(JSON.stringify(result.props, null, 2));
    } else {
        console.log("⚠️ 유효한 Props를 찾지 못했습니다.");
    }
    console.log("------------------------------------------------");

  } catch (error) {
    console.error("\n❌ 오류 발생:", error.message);
  } finally {
    await browser.close();
  }
}

scrapeStorybook();