'use client'
import dynamic from 'next/dynamic'

const ReviewEntry = dynamic(() => import('@/components/ReviewEntry'), { ssr: false })

export default function Page() { return <ReviewEntry surface="study" /> }
