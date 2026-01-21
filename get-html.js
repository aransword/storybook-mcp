import puppeteer from "puppeteer";

const TARGET_URL = "http://localhost:6006/?path=/docs/example-button--docs";

async function getStorybookHTML() {
  console.log(`🔍 DOM 구조를 가지러 갑니다... \n👉 ${TARGET_URL}`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle0", timeout: 30000 });

    // Iframe 찾기
    const iframeElement = await page.waitForSelector('#storybook-preview-iframe', { timeout: 10000 });
    const frame = await iframeElement.contentFrame();
    
    // 테이블이 렌더링될 때까지 대기
    await frame.waitForSelector('table', { timeout: 5000 });

    // HTML 추출 (테이블을 감싸는 부모 요소나 테이블 자체를 가져옵니다)
    const htmlStructure = await frame.evaluate(() => {
      // 1. 테이블 찾기
      const table = document.querySelector('table');
      if (table) {
        // 테이블과 그 부모의 클래스 등을 확인하기 위해 부모의 HTML을 가져오거나
        // 테이블 자체의 HTML을 가져옵니다.
        return table.outerHTML; 
      }
      
      // 테이블이 없다면 sbdocs 전체를 가져옴 (너무 길 수 있으니 주의)
      const docs = document.querySelector('.sbdocs');
      return docs ? docs.innerHTML : "<body> 내용을 찾을 수 없습니다.";
    });

    console.log("\n👇 아래 HTML 코드를 복사해서 저에게 주세요! 👇\n");
    console.log(htmlStructure);
    console.log("\n------------------------------------------------\n");

  } catch (error) {
    console.error("❌ 오류:", error.message);
  } finally {
    await browser.close();
  }
}

getStorybookHTML();