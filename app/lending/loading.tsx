/** @format */

export default function Loading() {
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
        <p className='mt-4 text-gray-600'>Loading Lending Records...</p>
      </div>
    </div>
  );
}
