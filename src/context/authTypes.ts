export type BannerState = {
  type: 'success' | 'error' | null;
  message: string;
};

export type AuthContextValue = {
  userToken: string;
  setUserToken: (token: string | null) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  updateToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  sidebarVisible: boolean;
  setSidebarVisible: (v: boolean) => void;
  banner: BannerState;
  setBanner: (b: BannerState) => void;
  userInfo: Record<string, unknown> | false;
  setUserInfo: (info: Record<string, unknown> | false) => void;
  clearLocal: () => Promise<void>;
};

export const defaultAuthContext: AuthContextValue = {
  userToken: '',
  setUserToken: () => {},
  loading: true,
  setLoading: () => {},
  updateToken: async () => {},
  logout: async () => {},
  sidebarVisible: false,
  setSidebarVisible: () => {},
  banner: { type: null, message: '' },
  setBanner: () => {},
  userInfo: false,
  setUserInfo: () => {},
  clearLocal: async () => {},
};
