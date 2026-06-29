import { motion } from 'framer-motion'

interface Props {
  active: boolean
}

const bars = 5

export function WaveAnimation({ active }: Props) {
  return (
    <div className="flex items-center gap-[2px] h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-[#FF6B00]"
          animate={
            active
              ? {
                  height: [4, 14, 6, 12, 4],
                  transition: {
                    repeat: Infinity,
                    duration: 0.6,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  },
                }
              : { height: 4 }
          }
        />
      ))}
    </div>
  )
}
