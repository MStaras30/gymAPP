"use client";

import { useState } from "react";

export default function HomeClient() {
  const [x] = useState(1);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      HomeClient OK: {x}
    </div>
  );
}
