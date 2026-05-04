import { useTheme } from "@/contexts/ThemeContext";
import colors from "@/constants/colors";

type Palette = typeof colors.light;

const palettes: { light: Palette; dark: Palette } = {
  light: colors.light,
  dark: colors.dark,
};

export function useColors() {
  const { isDark } = useTheme();
  const palette = isDark ? palettes.dark : palettes.light;
  return { ...palette, radius: colors.radius };
}
