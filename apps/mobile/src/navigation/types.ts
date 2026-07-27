export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  SpotifyConnect: undefined;
  Home: undefined;
  CreateSession: undefined;
  // toastMessage(선택) — PB-02(docs/design/06-ui-polish-audit.md): SessionSettingsView가 Modal에서
  // 실제 스택 화면으로 바뀌면서, "서비스 전환 완료" 같은 세션 설정발 토스트를 Room으로 돌아올 때
  // 함께 전달하기 위한 필드. 이미 스택에 있는 Room으로 navigate하면 네비게이션이 그 화면으로
  // 돌아가면서(goBack과 동일 효과) params를 병합해준다(React Navigation 문서 동작) — RoomScreen이
  // 이 값을 감지해 토스트로 띄운 뒤 스스로 지운다.
  Room: {sessionId: string; toastMessage?: string};
  /** 세션 설정 (00-ux-flow.md 2.13) — session/viewerRole/myPlatform은 화면 내부에서 useSession()으로 직접 조회한다. */
  SessionSettings: undefined;
};
