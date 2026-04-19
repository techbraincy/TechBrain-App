'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Bot, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import type { AgentConfig } from '@/types/db'

const schema = z.object({
  agent_name:               z.string().min(1),
  language:                 z.enum(['greek', 'english', 'bilingual']),
  tone:                     z.enum(['professional', 'friendly', 'casual']),
  greeting_greek:           z.string().optional(),
  greeting_english:         z.string().optional(),
  custom_instructions:      z.string().optional(),
  escalation_enabled:       z.boolean(),
  escalation_phone:         z.string().optional(),
  escalation_message_greek: z.string().optional(),
  escalation_message_english: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const LANGUAGES = [
  { value: 'bilingual', label: 'Bilingual 🇬🇷 🇬🇧' },
  { value: 'greek',     label: 'Ελληνικά μόνο' },
  { value: 'english',   label: 'English only' },
] as const

const TONES = [
  { value: 'professional', label: 'Επαγγελματικό' },
  { value: 'friendly',     label: 'Φιλικό' },
  { value: 'casual',       label: 'Χαλαρό' },
] as const

interface Props {
  businessId:  string
  agentConfig: AgentConfig | null
  agentId:     string | null
}

export function AgentConfigClient({ businessId, agentConfig, agentId }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving]   = useState(false)

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      agent_name:               agentConfig?.agent_name ?? 'Assistant',
      language:                 agentConfig?.language ?? 'bilingual',
      tone:                     agentConfig?.tone ?? 'friendly',
      greeting_greek:           agentConfig?.greeting_greek ?? '',
      greeting_english:         agentConfig?.greeting_english ?? '',
      custom_instructions:      agentConfig?.custom_instructions ?? '',
      escalation_enabled:       agentConfig?.escalation_enabled ?? false,
      escalation_phone:         agentConfig?.escalation_phone ?? '',
      escalation_message_greek: agentConfig?.escalation_message_greek ?? '',
      escalation_message_english: agentConfig?.escalation_message_english ?? '',
    },
  })

  const language   = watch('language')
  const escalation = watch('escalation_enabled')

  async function saveConfig(values: FormData) {
    setSaving(true)
    try {
      const res = await fetch(`/api/businesses/${businessId}/agent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Ρυθμίσεις αποθηκεύτηκαν')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function syncAgent() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/businesses/${businessId}/agent/sync`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Agent συγχρονίστηκε επιτυχώς')
      window.location.reload()
    } catch (e: any) {
      toast.error(`Αποτυχία συγχρονισμού: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const syncStatus = agentConfig?.sync_status

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex size-12 items-center justify-center rounded-xl',
              agentId ? 'bg-emerald-100' : 'bg-amber-100'
            )}>
              <Bot className={cn('size-6', agentId ? 'text-emerald-600' : 'text-amber-600')} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">ElevenLabs Agent</p>
                {syncStatus === 'synced' && <Badge variant="success" className="gap-1"><CheckCircle2 className="size-3" /> Συγχρονισμένος</Badge>}
                {syncStatus === 'failed' && <Badge variant="destructive" className="gap-1"><AlertCircle className="size-3" /> Αποτυχία</Badge>}
                {syncStatus === 'pending' && <Badge variant="warning">Εκκρεμεί</Badge>}
              </div>
              {agentId
                ? <p className="text-xs text-muted-foreground font-mono mt-0.5">{agentId}</p>
                : <p className="text-sm text-muted-foreground mt-0.5">Ο agent δεν έχει δημιουργηθεί ακόμα</p>
              }
              {agentConfig?.sync_error && (
                <p className="text-xs text-destructive mt-1">{agentConfig.sync_error}</p>
              )}
            </div>
            <Button
              variant={agentId ? 'outline' : 'default'}
              size="sm"
              onClick={syncAgent}
              loading={syncing}
              className="gap-2 shrink-0"
            >
              <RefreshCw className="size-4" />
              {agentId ? 'Επανασύνδεση' : 'Δημιουργία agent'}
            </Button>
          </div>

          {agentConfig?.last_synced_at && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              Τελευταίος συγχρονισμός: {new Date(agentConfig.last_synced_at).toLocaleString('el-GR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Config form */}
      <form onSubmit={handleSubmit(saveConfig)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ταυτότητα & Γλώσσα</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>Όνομα agent</Label>
              <Input placeholder="π.χ. Maria, Alex, Assistant" {...register('agent_name')} />
            </div>

            <div className="space-y-2">
              <Label>Γλώσσα</Label>
              <div className="flex gap-2">
                {LANGUAGES.map((l) => (
                  <button key={l.value} type="button"
                    onClick={() => setValue('language', l.value, { shouldDirty: true })}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                      language === l.value ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/40'
                    )}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ύφος επικοινωνίας</Label>
              <div className="flex gap-2">
                {TONES.map((t) => (
                  <button key={t.value} type="button"
                    onClick={() => setValue('tone', t.value, { shouldDirty: true })}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                      watch('tone') === t.value ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/40'
                    )}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Χαιρετισμοί</CardTitle>
            <CardDescription>Η πρώτη πρόταση που θα ακούσει ο καλών</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(language === 'greek' || language === 'bilingual') && (
              <div className="space-y-1.5">
                <Label>Ελληνικά</Label>
                <Input placeholder="Καλημέρα σας, μιλάτε με…" {...register('greeting_greek')} />
              </div>
            )}
            {(language === 'english' || language === 'bilingual') && (
              <div className="space-y-1.5">
                <Label>English</Label>
                <Input placeholder="Hello, you've reached…" {...register('greeting_english')} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Επιπλέον οδηγίες</CardTitle>
            <CardDescription>Κανόνες που προστίθενται στο system prompt</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={4} placeholder="π.χ. Μην δέχεσαι παραγγελίες για περισσότερα από 50 άτομα…" {...register('custom_instructions')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Σύνδεση με προσωπικό</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Controller control={control} name="escalation_enabled"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
              <Label>Ενεργοποίηση escalation σε ανθρώπινο προσωπικό</Label>
            </div>
            {escalation && (
              <div className="space-y-3 pl-1">
                <div className="space-y-1.5">
                  <Label>Τηλέφωνο προσωπικού</Label>
                  <Input type="tel" placeholder="+30 69..." {...register('escalation_phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Μήνυμα escalation (Ελληνικά)</Label>
                  <Input placeholder="Θα σας συνδέσω με το προσωπικό μας." {...register('escalation_message_greek')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Escalation message (English)</Label>
                  <Input placeholder="Let me connect you with our staff." {...register('escalation_message_english')} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Μετά την αποθήκευση, κάντε «Επανασύνδεση» για να ενημερωθεί ο agent.
          </p>
          <Button type="submit" loading={saving} disabled={!isDirty}>
            Αποθήκευση αλλαγών
          </Button>
        </div>
      </form>
    </div>
  )
}
