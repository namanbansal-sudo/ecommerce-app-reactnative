import { router } from "expo-router";

let originTab: string | null = null;

const NavigationService = {
  navigate: (path: string, params?: Record<string, any>) => {
    if (params) {
      router.navigate({ pathname: path as any, params });
    } else {
      router.navigate(path as any);
    }
  },
  replace: (path: string, params?: Record<string, any>) => {
    if (params) {
      router.push({ pathname: path as any, params });
    } else {
      router.push(path as any);
    }
  },
  push: (path: string, params?: Record<string, any>) => {
    if (params) {
      router.push({ pathname: path as any, params });
    } else {
      router.push(path as any);
    }
  },
  back: () => {
    router.back();
  },

  canGoBack: () => {
    return router.canGoBack();
  },

  saveTabPath: (path: string) => {
    originTab = path;
  },

  navigateToTab: () => {
    const tab = originTab || "tabs";
    originTab = null;
    NavigationService.navigate(`${tab}` as any);
  },
};

export default NavigationService;
