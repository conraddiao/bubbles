'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Phone, Mail, Users, Smartphone, Share2, UserPlus, ChevronDown, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getGroupMembers,
  removeGroupMember,
  subscribeToGroupMembers
} from '@/lib/database'
import { toast } from 'sonner'
import { getDisplayName, getInitials, extractNames } from '@/lib/name-utils'

interface GroupMember {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar_url?: string | null
  notifications_enabled: boolean
  joined_at: string
  is_owner: boolean
}

interface MemberListProps {
  groupId: string
  groupName: string
  isOwner: boolean
  onExportContacts?: () => void
  layout?: 'card' | 'embedded'
}

const escapeVCardValue = (value?: string | null) => {
  if (!value) return ''
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .trim()
}

export function MemberList({ groupId, groupName, isOwner, layout = 'card' }: MemberListProps) {
  const queryClient = useQueryClient()
  const knownMemberIdsRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef(true)
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [newMemberIds, setNewMemberIds] = useState<Set<string>>(new Set())

  const [isExporting, setIsExporting] = useState(false)

  // SMS state
  const [smsPhone, setSmsPhone] = useState('')
  const [showSmsInput, setShowSmsInput] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const { data: members, isLoading, error } = useQuery<GroupMember[]>({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const result = await getGroupMembers(groupId)
      if (result.error) {
        throw new Error(result.error)
      }
      return (result.data || []) as GroupMember[]
    },
  })

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent)
  const totalMembers = members?.length ?? 0
  const disableBulkActions = !members || members.length === 0

  // Detect newly joined members for animation
  useEffect(() => {
    if (!members) return
    const currentIds = new Set(members.map(m => m.id))
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      knownMemberIdsRef.current = currentIds
      return
    }
    const freshIds = new Set<string>()
    for (const id of currentIds) {
      if (!knownMemberIdsRef.current.has(id)) {
        freshIds.add(id)
      }
    }
    knownMemberIdsRef.current = currentIds
    if (freshIds.size > 0) {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current)
      setNewMemberIds(prev => new Set([...prev, ...freshIds]))
      animationTimerRef.current = setTimeout(() => {
        setNewMemberIds(new Set())
        animationTimerRef.current = null
      }, 700)
    }
  }, [members])

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const result = await removeGroupMember(membershipId)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      toast.success('Member removed successfully')
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to remove member'
      toast.error(message)
    },
  })

  useEffect(() => {
    const subscription = subscribeToGroupMembers(groupId, (payload: unknown) => {
      const p = payload as Record<string, unknown> | null
      if (p?.eventType === 'INSERT') {
        const newRecord = p.new as Record<string, unknown> | undefined
        if (newRecord) {
          const name = [newRecord.first_name, newRecord.last_name].filter(Boolean).join(' ') || 'Someone'
          toast(`${name} just joined!`)
        }
      }
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
    })
    return () => { subscription.unsubscribe() }
  }, [groupId, queryClient])

  const handleRemoveMember = (member: GroupMember) => {
    if (member.is_owner) {
      toast.error('Cannot remove the group owner')
      return
    }
    if (confirm(`Are you sure you want to remove ${getDisplayName(member)} from the group?`)) {
      removeMemberMutation.mutate(member.id)
    }
  }

  // vCard generation
  const generateVCard = (member: GroupMember): string => {
    const { firstName, lastName } = extractNames(member)
    const fullName = getDisplayName(member) || member.email || 'Bubbles Member'
    const givenName = firstName || fullName
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${escapeVCardValue(lastName)};${escapeVCardValue(givenName)};;;`,
      `FN:${escapeVCardValue(fullName)}`,
      `EMAIL;TYPE=INTERNET:${escapeVCardValue(member.email)}`,
    ]
    if (member.phone) vcard.push(`TEL;TYPE=CELL:${escapeVCardValue(member.phone)}`)
    if (member.avatar_url) vcard.push(`PHOTO;VALUE=URI:${escapeVCardValue(member.avatar_url)}`)
    vcard.push(`ORG:${escapeVCardValue(groupName)} | bubbles.fyi`)
    vcard.push(`NOTE:${escapeVCardValue(`Member of ${groupName} group from bubbles.fyi`)}`)
    vcard.push('END:VCARD')
    return vcard.join('\r\n')
  }

  const generateBulkVCard = (memberList: GroupMember[]): string =>
    `${memberList.map(generateVCard).join('\r\n\r\n')}\r\n`

  const getSingleContactFilename = (member: GroupMember) => {
    const { firstName, lastName } = extractNames(member)
    return `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9_]/g, '_') + '.vcf'
  }

  const downloadViaDataUri = (content: string) => {
    window.location.href = `data:text/x-vcard;charset=utf-8,${encodeURIComponent(content)}`
  }

  const downloadViaShare = async (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/x-vcard;charset=utf-8' })
    const file = new File([blob], filename, { type: blob.type })
    if (!navigator.canShare?.({ files: [file] })) {
      downloadViaDataUri(content)
      return
    }
    try {
      await navigator.share({ files: [file] })
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return
      downloadViaDataUri(content)
    }
  }

  const downloadViaBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/x-vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportAllContacts = async (via: 'share' | 'direct' | 'auto' = 'auto') => {
    if (!members || members.length === 0) return toast.error('No members to export')
    try {
      setIsExporting(true)
      const content = generateBulkVCard(members)
      const filename = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_all_contacts.vcf`
      if (via === 'share') await downloadViaShare(content, filename)
      else if (via === 'direct') downloadViaDataUri(content)
      else downloadViaBlob(content, filename)
      toast.success(`All ${members.length} contacts exported`)
    } catch { toast.error('Failed to export contacts') }
    finally { setIsExporting(false) }
  }

  const sendContactsViaSms = async () => {
    if (!smsPhone.trim()) return toast.error('Enter a phone number')
    try {
      setIsSending(true)
      const res = await fetch('/api/sms/send-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: smsPhone.trim(), groupId, groupName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      toast.success('Contacts sent! Check your messages.')
      setShowSmsInput(false)
      setSmsPhone('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send contacts via SMS')
    } finally { setIsSending(false) }
  }

  const memberCount = members?.length ?? 0

  // Header with Select All + Text Me
  const headerContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold leading-tight">Group Members</h3>
          <p className="text-sm text-muted-foreground">
            {memberCount} member{memberCount !== 1 ? 's' : ''} in {groupName}
          </p>
        </div>
        {!disableBulkActions && (
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex">
              <Button
                onClick={() => setShowSmsInput(!showSmsInput)}
                variant="outline"
                size="sm"
                className="rounded-r-none border-r-0"
              >
                <Smartphone className="h-4 w-4" />
                Text Me
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none px-2"
                    disabled={isExporting}
                    aria-label="Export options"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isIOS ? (
                    <>
                      <DropdownMenuItem onClick={() => exportAllContacts('direct')}>
                        <UserPlus className="h-4 w-4" />
                        Add All ({totalMembers})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportAllContacts('share')}>
                        <Share2 className="h-4 w-4" />
                        Share All ({totalMembers})
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => exportAllContacts()}>
                      <Download className="h-4 w-4" />
                      Export All ({totalMembers})
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      {/* SMS panel */}
      {showSmsInput && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={smsPhone}
            onChange={(e) => setSmsPhone(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => { if (e.key === 'Enter') sendContactsViaSms() }}
          />
          <Button onClick={sendContactsViaSms} disabled={isSending || !smsPhone.trim()} size="sm">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
          <Button onClick={() => { setShowSmsInput(false); setSmsPhone('') }} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    const skeleton = (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
    return layout === 'card' ? (
      <Card>
        <CardHeader>{headerContent}</CardHeader>
        <CardContent>{skeleton}</CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        {headerContent}
        {skeleton}
      </div>
    )
  }

  if (error) {
    const content = (
      <p className="text-sm text-muted-foreground">
        {error.message || 'An error occurred while loading group members.'}
      </p>
    )
    return layout === 'card' ? (
      <Card>
        <CardHeader>{headerContent}</CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    ) : (
      <div className="space-y-2">
        {headerContent}
        {content}
      </div>
    )
  }

  if (!members || members.length === 0) {
    const emptyState = (
      <div className="rounded-lg border border-dashed py-6 text-center">
        <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Share your group link to start collecting contact information.
        </p>
      </div>
    )
    return layout === 'card' ? (
      <Card>
        <CardHeader>{headerContent}</CardHeader>
        <CardContent>{emptyState}</CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        {headerContent}
        {emptyState}
      </div>
    )
  }

  const mobileList = (
    <div className="flex flex-col gap-3 md:hidden">
      {members.map((member) => (
        <div
          key={member.id}
          className={`rounded-lg border bg-card/50 p-3 shadow-sm${newMemberIds.has(member.id) ? ' animate-bubble-enter' : ''}`}
        >
          <div className="flex items-center gap-3">
            <Avatar>
              {member.avatar_url && <AvatarImage src={member.avatar_url} alt={getDisplayName(member)} />}
              <AvatarFallback>{getInitials(member)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{getDisplayName(member)}</span>
                {member.is_owner && (
                  <Badge variant="secondary" className="text-xs">Owner</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="h-4 w-4" aria-label="Has email" />
              {member.phone && <Phone className="h-4 w-4" aria-label="Has phone" />}
            </div>
            {isOwner && !member.is_owner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveMember(member)}
                disabled={removeMemberMutation.isPending}
                className="text-destructive hover:text-destructive"
                aria-label={`Remove ${getDisplayName(member)} from group`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const table = (
    <div className="hidden rounded-md border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Contact</TableHead>
            {isOwner && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id} className={newMemberIds.has(member.id) ? 'animate-bubble-enter' : ''}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    {member.avatar_url && <AvatarImage src={member.avatar_url} alt={getDisplayName(member)} />}
                    <AvatarFallback>{getInitials(member)}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getDisplayName(member)}</span>
                    {member.is_owner && (
                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" aria-label="Has email" />
                  {member.phone && <Phone className="h-4 w-4" aria-label="Has phone" />}
                </div>
              </TableCell>
              {isOwner && (
                <TableCell>
                  {!member.is_owner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removeMemberMutation.isPending}
                      className="text-destructive hover:text-destructive"
                      aria-label={`Remove ${getDisplayName(member)} from group`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return layout === 'card' ? (
    <Card>
      <CardHeader>{headerContent}</CardHeader>
      <CardContent className="space-y-4">
        {mobileList}
        {table}
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-4">
      {headerContent}
      {mobileList}
      {table}
    </div>
  )
}
