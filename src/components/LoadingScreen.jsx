export default function LoadingScreen({ status }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 border-4 border-green-200 rounded-full" />
        <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-lg font-medium text-gray-700 mb-2">
        {status || 'Reading nutrition facts...'}
      </p>
      <p className="text-sm text-gray-400">This may take a few seconds</p>
    </div>
  )
}
