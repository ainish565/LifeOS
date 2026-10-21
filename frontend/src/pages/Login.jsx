import { useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateLogin } from '../utils/authValidation'
import AuthLayout, { Field, FormAlert, PasswordToggle, SubmitButton } from '../components/auth/AuthLayout'
import styles from './AuthForm.module.css'

export default function Login() {
  const { login } = useAuth()
  const location = useLocation()
  const formRef = useRef(null)

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((errs) => ({ ...errs, [field]: undefined }))
    setFormError('')
  }

  const focusFirstInvalid = () => {
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const clientErrors = validateLogin(form)
    setErrors(clientErrors)
    setFormError('')
    if (Object.keys(clientErrors).length) {
      focusFirstInvalid()
      return
    }

    setSubmitting(true)
    try {
      // On success the GuestOnly guard redirects to the requested page
      await login(form)
    } catch (err) {
      if (err.data?.errors) {
        setErrors(err.data.errors)
        focusFirstInvalid()
      } else {
        setFormError(err.message)
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue to your workspace."
      footer={
        <>
          New to Life OS?{' '}
          <Link to={{ pathname: '/register', search: location.search }}>Create an account</Link>
        </>
      }
    >
      <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormAlert>{formError}</FormAlert>

        <Field
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          autoFocus
        />

        <Field
          id="login-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        />

        <SubmitButton loading={submitting} loadingText="Logging in…">Log in</SubmitButton>
      </form>
    </AuthLayout>
  )
}
