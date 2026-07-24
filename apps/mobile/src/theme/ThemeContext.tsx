import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {ColorTokens, darkColors, lightColors} from './tokens';

/**
 * 다크모드를 1급 시민으로 취급한다 (01-style-guide.md 4절 제안).
 * 기기 설정(useColorScheme)을 그대로 따르고, 별도의 수동 토글은 이번 라운드 범위 밖(TODO).
 */
const ThemeContext = createContext<ColorTokens>(darkColors);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const scheme = useColorScheme();
  const colors = useMemo(() => (scheme === 'light' ? lightColors : darkColors), [scheme]);
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ColorTokens {
  return useContext(ThemeContext);
}
