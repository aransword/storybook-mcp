Storybook MCP Server 📚
Storybook의 Docs 페이지를 분석하여 컴포넌트의 이름과 Props(Args) 정보를 추출하는 MCP(Model Context Protocol) 서버입니다.

Claude Desktop과 같은 MCP 클라이언트와 연동하여, Storybook URL만 입력하면 AI가 해당 컴포넌트의 스펙을 자동으로 이해하고 코드를 작성하거나 문서를 요약할 수 있도록 돕습니다.

✨ 기능 (Features)
컴포넌트 분석: Storybook Docs 페이지 URL을 방문하여 컴포넌트 이름을 식별합니다.

Props(Args) 추출: ArgsTable을 파싱하여 Props의 이름, 설명, 기본값(Default), 타입을 추출합니다.

최신 버전 지원: Storybook v7, v8 및 최신 v10 구조의 Docs 페이지 렌더링을 지원합니다 (Puppeteer 기반).

MCP 표준 준수: Model Context Protocol을 따르므로 Claude Desktop 등 다양한 클라이언트에서 즉시 사용 가능합니다.

🛠 기술 스택 (Tech Stack)
Node.js: 런타임 환경

Puppeteer: Headless Browser를 이용한 동적 웹 스크래핑

@modelcontextprotocol/sdk: MCP 서버 구현을 위한 공식 SDK

🚀 시작하기 (Getting Started)
사전 요구사항 (Prerequisites)
Node.js v18 이상

npm

설치 (Installation)
Bash

# 1. 리포지토리 클론
git clone https://github.com/aransword/storybook-mcp.git
cd storybook-mcp

# 2. 의존성 설치
npm install
🔌 Claude Desktop 연동 방법
이 서버를 Claude Desktop에서 사용하려면 설정 파일(claude_desktop_config.json)을 수정해야 합니다.

설정 파일을 엽니다.

macOS: ~/Library/Application Support/Claude/claude_desktop_config.json

Windows: %APPDATA%\Claude\claude_desktop_config.json

아래 내용을 추가합니다. (경로는 실제 프로젝트 경로로 변경해주세요)

JSON

{
  "mcpServers": {
    "storybook-inspector": {
      "command": "node",
      "args": [
        "/절대경로/path/to/your/storybook-mcp/index.js"
      ]
    }
  }
}
Claude Desktop을 재시작합니다.

💡 사용 예시 (Usage)
Claude에게 다음과 같이 질문할 수 있습니다:

"이 Storybook 링크를 분석해서 어떤 Props가 있는지 알려줘: http://localhost:6006/?path=/docs/example-button--docs"

또는

"이 컴포넌트의 스토리북 명세를 바탕으로 React 사용 예제 코드를 작성해줘."

📦 배포 (Publishing)
추후 npm 레지스트리에 배포될 예정입니다.

Bash

# 로컬에서 실행 테스트 (배포 후)
npx @woori-fisa-6th/storybook-mcp
📝 라이선스 (License)
ISC