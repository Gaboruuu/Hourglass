import { View, Text, Button, Alert, StyleSheet } from 'react-native'
import React from 'react'
import { TextInput } from 'react-native-gesture-handler'
import { useUser } from '@/context/UserContext'
import { useTheme } from '@/context/ThemeContext'

export default function LoginScreen() {
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { setUser } = useUser()
  const { colors } = useTheme()

  const handleLogin = async () => {
    setError(null)
    if (!username || !password) {
      setError('Please enter both username and password.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("http://192.168.1.21:5000/auth/login", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        // Try to parse error as JSON, fallback to a friendly message
        let errorMessage = 'Invalid username or password.'
        try {
          const errorData = await response.json()
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message
          }
        } catch {
          // If not JSON, keep the default message
        }
        setError(errorMessage)
        return
      }

      const data = await response.json()
      setUser({
        id: data.user.user_id,
        username: data.user.username,
        admin: !!data.user.admin,
      })
      Alert.alert('Login Successful', `Welcome back! ${data.user.username}`)
      console.log('Succesfully logged in as ', data.user.username, 'with admin status: ', data.user.admin)
    } catch (error: any) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: colors.text
  },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text
  },
  error: {
    color: '#d32f2f',
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    textAlign: 'center'
  }
})

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize='none'
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        autoCapitalize='none'
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Login" onPress={handleLogin} disabled={isLoading} />
    </View>
  )
}

