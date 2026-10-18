declare global {
  interface Window {
    roamAlphaAPI: any;
    __roamPeleCleanup?: () => void;
  }
}
export {};
