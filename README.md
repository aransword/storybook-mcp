# 📘 Storybook MCP Server 🚀

이 서버는 **Model Context Protocol (MCP)** 을 통해  
AI 에이전트(**Cline, Roo Code, Claude Desktop** 등)가  
로컬 **Storybook 컴포넌트 명세를 직접 읽고 분석**할 수 있도록 돕는 도구입니다.

---

## ✨ 주요 기능 (Core Features)

### 🔍 스마트 컴포넌트 탐색
- `configure.mdx`와 같은 단순 문서는 제외
- **실제 사용 예시(Story)가 존재하는 진짜 UI 컴포넌트만** 선별하여 목록 제공

### 📋 Props 명세 추출
- 컴포넌트의 **Docs 페이지** 분석
- `ArgsTable`에 정의된 Props의  
  **이름 / 설명 / 기본값**을 정확하게 추출

### 💻 소스 코드 추출
- Docs 페이지의 **“Show code” 버튼을 자동 클릭**
- 각 스토리별 **실제 React / JSX 구현 예시 코드** 수집

### 🧠 자동 환경 대응
- Docs 탭이 없는 컴포넌트의 경우  
  **Story(Canvas) 탭으로 자동 전환**하여 유연하게 처리

---

## ⚙️ 설치 및 설정 (Setup)

### 1️⃣ 사전 요구 사항
- **Node.js** 설치
- 분석 대상 프로젝트의 **Storybook 실행 중**
  - 기본 URL: `http://localhost:6006`

---

### 2️⃣ MCP 설정 (Configuration)

`claude_desktop_config.json` 또는  
VS Code의 MCP 설정 파일(Cline 설정 등)에 아래 내용을 추가합니다.

```json
{
  "mcpServers": {
    "storybook-mcp": {
      "command": "node",
      "args": [
        "-y",
        "@woori-fisa-6th/storybook-mcp"
      ],
      "env": {
        "STORYBOOK_URL": "storybook_url_to_access"
      }
    }
  }
}
```

## 🧰 도구 명세 (Tool Definitions)

---

### 1️⃣ `list_storybook_components`

**설명**  
설정된 Storybook URL의 `index.json`을 분석하여  
**스토리가 존재하는 유효 컴포넌트 목록**을 반환합니다.

**동작 방식**
- `configure.mdx` 등 단순 문서 스토리 제외
- 실제 Story가 존재하는 컴포넌트만 필터링

**반환 데이터**
- `name` : 컴포넌트 이름
- `url` : 접속 가능한 Docs 또는 Story 페이지 URL
- `hasDocs` : Docs 페이지 존재 여부 (`true | false`)
- `availableStories` : 포함된 스토리 이름 목록

---

### 2️⃣ `analyze_storybook_props`

**인자**
- `url` *(string)* : 분석할 컴포넌트의 Docs 페이지 주소

**설명**  
Puppeteer를 사용하여 페이지가 완전히 렌더링될 때까지 대기한 후,  
`ArgsTable (.docblock-argstable)`에 정의된 **실제 Props 정보**를 추출합니다.

**동작 방식**
- Docs 탭 자동 진입
- Props 테이블 렌더링 감지 후 데이터 수집

**반환 데이터**
- `name` : Prop 이름
- `description` : Prop 설명
- `defaultValue` : 기본값

---

### 3️⃣ `extract_component_stories`

**인자**
- `url` *(string)* : 컴포넌트 Docs 페이지 주소

**설명**  
컴포넌트의 실제 구현 예시를 얻기 위해  
페이지 내 모든 **“Show code” 버튼을 자동으로 클릭**하여  
스토리별 소스 코드를 수집합니다.

**동작 방식**
- Docs 탭 우선 시도
- Docs가 없을 경우 Canvas(Story) 탭으로 자동 전환
- 각 스토리의 코드 블록 추출

**반환 데이터**
- `stories` : 스토리 배열
  - `name` : 스토리 이름
  - `code` : 해당 스토리의 React / JSX 소스 코드

---
