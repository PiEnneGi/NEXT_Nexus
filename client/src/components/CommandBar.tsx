import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Image, Mic, MicOff, Send } from 'lucide-react'
import { WaveAnimation } from './WaveAnimation'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

const MOCK_TRANSCRIPTIONS = [
  "Deploy a scalable microservices architecture on AWS with ECS Fargate, RDS PostgreSQL, and ElastiCache Redis. Include a VPC with public and private subnets across three availability zones.",
  "Build a serverless data pipeline using AWS Lambda, Kinesis Data Streams, S3, and DynamoDB. Implement event-driven processing with SQS dead-letter queues and CloudWatch monitoring.",
  "Provision a Kubernetes cluster on EKS with node groups, IAM roles for service accounts, and a CI/CD pipeline using CodePipeline. Include ALB ingress controller and cert-manager for TLS.",
  "Design a multi-region disaster recovery setup on AWS with Route53 failover, RDS cross-region replicas, S3 cross-region replication, and CloudFront with origin failover.",
  "Create a SOC 2 compliant infrastructure on AWS with CloudTrail, Config rules, GuardDuty, Security Hub, VPC flow logs, and encrypted EBS volumes with KMS CMK.",
  "Deploy a real-time chat application infrastructure using WebSocket API Gateway, DynamoDB streams, Lambda, and ElastiCache for session management across two regions.",
]

const MOCK_TRANSCRIPTION_COMMANDS = [
  "Configure an Auto Scaling group with launch templates, target tracking policies, and scheduled scaling for a production web application on EC2.",
  "Set up a CI/CD pipeline with GitHub Actions, ECR, and ECS blue/green deployments using CodeDeploy with automatic rollback on health check failure.",
]

function getRandomTranscription(): string {
  const all = [...MOCK_TRANSCRIPTIONS, ...MOCK_TRANSCRIPTION_COMMANDS]
  return all[Math.floor(Math.random() * all.length)]
}

export function CommandBar({ onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setListening(false)
  }, [])

  const startListening = useCallback(async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      mediaRecorderRef.current = recorder
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const simulatedText = getRandomTranscription()
        setInput((prev) => (prev ? prev + ' ' + simulatedText : simulatedText))
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
      }

      recorder.onerror = () => {
        setMicError('Recording error')
        stopListening()
      }

      recorder.start()
      setListening(true)

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, 3000)
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied'
          : 'Microphone unavailable'
      setMicError(msg)
      setListening(false)
    }
  }, [stopListening])

  const handleToggleMic = () => {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50"
    >
      <div className="flex items-center gap-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl px-3 py-2 shadow-2xl">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => fileRef.current?.click()}
          className="p-1.5 rounded-lg hover:bg-[#1A1A1A] text-gray-400 hover:text-white transition-colors"
        >
          <Image size={16} />
        </motion.button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" />

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the infrastructure architecture..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none font-mono"
          disabled={disabled}
        />

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleToggleMic}
          className={`p-1.5 rounded-lg transition-colors ${
            listening
              ? 'bg-[#FF3333]/20 text-[#FF3333]'
              : micError
                ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                : 'hover:bg-[#1A1A1A] text-gray-400 hover:text-white'
          }`}
          title={micError ?? (listening ? 'Stop recording' : 'Start recording')}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </motion.button>

        <WaveAnimation active={listening} />

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="p-1.5 rounded-lg bg-[#FF6B00] text-white hover:bg-[#e55f00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </motion.button>
      </div>
    </motion.div>
  )
}
