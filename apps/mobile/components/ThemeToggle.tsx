import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme } from '../context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme, colors } = useAppTheme()

  return (
    <TouchableOpacity onPress={toggleTheme} style={[styles.button, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons
        name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
        size={20}
        color={colors.textMuted}
      />
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {theme === 'dark' ? 'Light' : 'Dark'}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
})
