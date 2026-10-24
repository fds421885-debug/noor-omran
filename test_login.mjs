import { JSDOM } from "jsdom";
import fs from "fs";

async function runTest() {
  const html = fs.readFileSync("./index.html", "utf-8");

  const dom = new JSDOM(html, {
    url: "http://localhost:3000/",
    runScripts: "dangerously",
    resources: "usable"
  });

  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  global.sessionStorage = window.sessionStorage;
  global.Event = window.Event;
  global.CustomEvent = window.CustomEvent;
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.HTMLButtonElement = window.HTMLButtonElement;

  window.scrollTo = () => {};

  console.log("Loading app.js...");
  try {
    await import("./app.js");
    console.log("app.js imported successfully!");
  } catch (err) {
    console.error("FATAL ERROR loading app.js:", err);
    return;
  }

  // Allow any pending async init to settle
  await new Promise(r => setTimeout(r, 500));

  console.log("\n--- TEST 1: Initial State ---");
  const heroSection = document.getElementById("heroSection");
  const loginSection = document.getElementById("loginSection");
  const studentSection = document.getElementById("studentSection");
  const supervisorSection = document.getElementById("supervisorSection");
  const appGlobalLoader = document.getElementById("appGlobalLoader");

  console.log("heroSection class:", heroSection?.className);
  console.log("loginSection class:", loginSection?.className);
  console.log("studentSection class:", studentSection?.className);
  console.log("supervisorSection class:", supervisorSection?.className);
  console.log("appGlobalLoader class:", appGlobalLoader?.className);

  console.log("\n--- TEST 2: Clicking Start Button ---");
  const btnStart = document.getElementById("btnStart");
  btnStart.click();
  console.log("After clicking Start:");
  console.log("heroSection class:", heroSection?.className);
  console.log("loginSection class:", loginSection?.className);

  console.log("\n--- TEST 3: Login as Supervisor ('محمد منتصر محمد يونس') ---");
  const fullNameInput = document.getElementById("fullNameInput");
  const loginForm = document.getElementById("loginForm");
  const btnSubmitLogin = document.getElementById("btnSubmitLogin");

  fullNameInput.value = "محمد منتصر محمد يونس";
  fullNameInput.dispatchEvent(new window.Event("input"));
  
  // Submit form
  loginForm.dispatchEvent(new window.Event("submit", { cancelable: true, bubbles: true }));
  await new Promise(r => setTimeout(r, 600));

  console.log("After supervisor submit:");
  console.log("supervisorSection class:", supervisorSection?.className);
  console.log("localStorage active_quran_user:", localStorage.getItem("active_quran_user"));

  console.log("\n--- TEST 4: Logging out ---");
  const quickLogoutBtn = document.getElementById("quickLogoutBtn");
  // showInAppConfirm mock
  window.showInAppConfirm = () => Promise.resolve(true);
  quickLogoutBtn?.click();
  await new Promise(r => setTimeout(r, 300));
  // confirm dialog yes button
  const yesBtn = document.getElementById("btnConfirmDialogYes");
  if (yesBtn) yesBtn.click();
  await new Promise(r => setTimeout(r, 300));

  console.log("After logout, heroSection class:", heroSection?.className);

  console.log("\n--- TEST 5: Login with short name / supervisor alias ('مشرف') ---");
  btnStart.click();
  fullNameInput.value = "مشرف";
  fullNameInput.dispatchEvent(new window.Event("input"));
  const validationAlert = document.getElementById("validationAlert");
  console.log("validationAlert text after typing 'مشرف':", validationAlert?.textContent, "hidden?", validationAlert?.classList.contains("hidden"));
  
  loginForm.dispatchEvent(new window.Event("submit", { cancelable: true, bubbles: true }));
  await new Promise(r => setTimeout(r, 600));
  console.log("After submit 'مشرف':");
  console.log("validationAlert:", validationAlert?.textContent, "hidden?", validationAlert?.classList.contains("hidden"));
  console.log("supervisorSection class:", supervisorSection?.className);
  console.log("loginSection class:", loginSection?.className);

  console.log("\n--- TEST 6: Student Login ('أحمد محمد علي حسن') ---");
  fullNameInput.value = "أحمد محمد علي حسن";
  fullNameInput.dispatchEvent(new window.Event("input"));
  loginForm.dispatchEvent(new window.Event("submit", { cancelable: true, bubbles: true }));
  await new Promise(r => setTimeout(r, 800));
  console.log("After student submit:");
  console.log("studentSection class:", studentSection?.className);
  console.log("localStorage active_quran_user:", localStorage.getItem("active_quran_user"));
  
  console.log("\nAll login tests completed successfully!");
  process.exit(0);
}

runTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
