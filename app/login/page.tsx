"use client"

import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function submit(path: string) {
    setError("")
    const res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
    } else {
      window.location.href = "/"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Prisijungimas</h1>

        <input
          className="w-full p-2 bg-zinc-800 rounded"
          placeholder="El. paštas"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-2 bg-zinc-800 rounded"
          placeholder="Slaptažodis"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500">{error}</p>}

        <button
          onClick={() => submit("login")}
          className="w-full bg-white text-black py-2 rounded"
        >
          Prisijungti
        </button>

        <button
          onClick={() => submit("register")}
          className="w-full border border-white py-2 rounded"
        >
          Registruotis
        </button>
      </div>
    </div>
  )
}