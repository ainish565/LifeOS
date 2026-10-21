import { useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateRegister } from '../utils/authValidation'
import AuthLayout, { Field, FormAlert, PasswordToggle, SubmitButton } from '../components/auth/AuthLayout'
import styles from './AuthForm.module.css'

export default function Register() {
  const { register } = useAuth()
  const location = useLocation()
  const formRef = useRef(null)

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form keys → error keys used by the API
  const errorKey = { confirmPassword: 'confirm_password' }

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((errs) => ({ ...errs, [errorKey[field] ?? field]: undefined }))
    setFormError('')
  }

  const focusFirstInvalid = () => {
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const clientErrors = validateRegister(form)
    setErrors(clientErrors)
    setFormError('')
    if (Object.keys(clientErrors).length) {
      focusFirstInvalid()
      return
    }

    setSubmitting(true)
    try {
      // Registration also logs the user in; GuestOnly then redirects to the app
      await register(form)
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

  const passwordToggle = (
    <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
  )

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up your personal Life OS workspace."
      footer={
        <>
          Already have an account?{' '}
          <Link to={{ pathname: '/login', search: location.search }}>Log in</Link>
        </>
      }
    >
      <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormAlert>{formError}</FormAlert>

        <Field
          id="register-name"
          label="Name"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          maxLength={80}
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          autoFocus
        />

        <Field
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />

        <Field
          id="register-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Create a password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
          trailing={passwordToggle}
        />

        <Field
          id="register-confirm"
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirm_password}
        />

        <SubmitButton loading={submitting} loadingText="Creating account…">Create account</SubmitButton>
      </form>
    </AuthLayout>
  )
}
