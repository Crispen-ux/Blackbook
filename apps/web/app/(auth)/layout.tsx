import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-1 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Image src="/logo.png" alt="BlackBook" width={500} height={125} priority />
        </div>
        {children}
      </div>
    </div>
  )
}
