'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download, FileText, Users, Loader2, UserPlus, Share2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getGroupMembers } from '@/lib/database'
import { toast } from 'sonner'
import { getDisplayName, extractNames } from '@/lib/name-utils'
import {
  generateMemberVCard,
  generateBulkVCard as generateBulkVCardBase,
} from '@/lib/vcard'

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

interface ContactExportProps {
  groupId: string
  groupName: string
  layout?: 'card' | 'embedded'
}

export function ContactExport({ groupId, groupName, layout = 'card' }: ContactExportProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const { data: members, isLoading } = useQuery<GroupMember[]>({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const result = await getGroupMembers(groupId)
      if (result.error) {
        throw new Error(result.error)
      }
      return (result.data || []) as GroupMember[]
    },
  })
  const totalMembers = members?.length ?? 0
  const disableBulkActions = !members || members.length === 0

  // Generate vCard content for a single member
  const generateVCard = (member: GroupMember): string =>
    generateMemberVCard(member, groupName)

  // Generate combined vCard content for multiple members
  const generateBulkVCard = (memberList: GroupMember[]): string =>
    generateBulkVCardBase(memberList, groupName)

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent)

  // Path A: data URI → Safari contact preview ("Create New Contact" at bottom)
  const downloadViaDataUri = (content: string, filename: string) => {
    const dataUrl = `data:text/x-vcard;charset=utf-8,${encodeURIComponent(content)}`
    window.location.href = dataUrl
  }

  // Path B: share sheet → user picks Contacts app → native import
  const downloadViaShare = async (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/x-vcard;charset=utf-8' })
    const file = new File([blob], filename, { type: blob.type })

    if (!navigator.canShare?.({ files: [file] })) {
      downloadViaDataUri(content, filename)
      return
    }

    try {
      await navigator.share({ files: [file] })
    } catch (error) {
      // User dismissed the share sheet — intentional, don't trigger another UI
      if ((error as { name?: string }).name === 'AbortError') return
      console.warn('Share failed, falling back', error)
      downloadViaDataUri(content, filename)
    }
  }

  // Desktop path: blob URL download
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

  const getSingleContactFilename = (member: GroupMember) => {
    const { firstName, lastName } = extractNames(member)
    return `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9_]/g, '_') + '.vcf'
  }

  // Export individual member contact (desktop + Android)
  const exportSingleContact = async (member: GroupMember, via: 'share' | 'direct' | 'auto' = 'auto') => {
    try {
      setIsExporting(true)
      const vCardContent = generateVCard(member)
      const filename = getSingleContactFilename(member)
      if (via === 'share') {
        await downloadViaShare(vCardContent, filename)
      } else if (via === 'direct') {
        downloadViaDataUri(vCardContent, filename)
      } else {
        downloadViaBlob(vCardContent, filename)
      }
      toast.success(`Contact exported: ${getDisplayName(member)}`)
    } catch (error) {
      console.error('Failed to export contact:', error)
      toast.error('Failed to export contact')
    } finally {
      setIsExporting(false)
    }
  }

  // Export selected members
  const exportSelectedContacts = async (via: 'share' | 'direct' | 'auto' = 'auto') => {
    if (!members || selectedMembers.length === 0) {
      toast.error('Please select at least one member to export')
      return
    }

    try {
      setIsExporting(true)
      const selectedMemberData = members.filter(member =>
        selectedMembers.includes(member.id)
      )

      const isSingle = selectedMemberData.length === 1
      const vCardContent = isSingle
        ? generateVCard(selectedMemberData[0])
        : generateBulkVCard(selectedMemberData)
      const filename = isSingle
        ? getSingleContactFilename(selectedMemberData[0])
        : `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_contacts.vcf`

      if (via === 'share') {
        await downloadViaShare(vCardContent, filename)
      } else if (via === 'direct') {
        downloadViaDataUri(vCardContent, filename)
      } else {
        downloadViaBlob(vCardContent, filename)
      }
      toast.success(isSingle
        ? `Contact exported: ${getDisplayName(selectedMemberData[0])}`
        : `${selectedMemberData.length} contacts exported`
      )
    } catch (error) {
      console.error('Failed to export contacts:', error)
      toast.error('Failed to export contacts')
    } finally {
      setIsExporting(false)
    }
  }

  // Export all members
  const exportAllContacts = async (via: 'share' | 'direct' | 'auto' = 'auto') => {
    if (!members || members.length === 0) {
      toast.error('No members to export')
      return
    }

    try {
      setIsExporting(true)
      const vCardContent = generateBulkVCard(members)
      const filename = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_all_contacts.vcf`
      if (via === 'share') {
        await downloadViaShare(vCardContent, filename)
      } else if (via === 'direct') {
        downloadViaDataUri(vCardContent, filename)
      } else {
        downloadViaBlob(vCardContent, filename)
      }
      toast.success(`All ${members.length} contacts exported`)
    } catch (error) {
      console.error('Failed to export all contacts:', error)
      toast.error('Failed to export all contacts')
    } finally {
      setIsExporting(false)
    }
  }

  // Send contacts via SMS (MMS with .vcf attachment)
  const [smsPhone, setSmsPhone] = useState('')
  const [showSmsInput, setShowSmsInput] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const sendContactsViaSms = async () => {
    if (!smsPhone.trim()) {
      toast.error('Enter a phone number')
      return
    }

    try {
      setIsSending(true)
      const res = await fetch('/api/sms/send-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: smsPhone.trim(),
          groupId,
          groupName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send')
      }

      toast.success('Contacts sent! Check your messages.')
      setShowSmsInput(false)
      setSmsPhone('')
    } catch (error) {
      console.error('SMS send error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send contacts via SMS')
    } finally {
      setIsSending(false)
    }
  }

  // Toggle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  // Select/deselect all members
  const toggleSelectAll = () => {
    if (!members) return
    
    if (selectedMembers.length === members.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(members.map(member => member.id))
    }
  }

  const Header = () => (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold leading-tight">Export Contacts</h3>
      <div className="flex shrink-0 items-center gap-1">
        {/* Selected-member export (inline, only when selection active) */}
        {selectedMembers.length > 0 && (
          isIOS ? (
            <>
              <Button
                onClick={() => exportSelectedContacts('direct')}
                disabled={isExporting}
                size="sm"
                title="Open in Contacts app"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Add ({selectedMembers.length})
              </Button>
              <Button
                onClick={() => exportSelectedContacts('share')}
                disabled={isExporting}
                size="sm"
                title="Share via iOS share sheet"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Share ({selectedMembers.length})
              </Button>
            </>
          ) : (
            <Button
              onClick={() => exportSelectedContacts()}
              disabled={isExporting}
              size="sm"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export ({selectedMembers.length})
            </Button>
          )
        )}

        {/* Get Contacts + export-all dropdown (split button) */}
        <div className="flex">
          <Button
            onClick={() => setShowSmsInput(!showSmsInput)}
            disabled={disableBulkActions}
            variant="outline"
            size="sm"
            className="rounded-r-none border-r-0"
          >
            <Smartphone className="h-4 w-4" />
            Get Contacts
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-l-none px-2"
                disabled={isExporting || disableBulkActions}
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
    </div>
  )

  const SmsPanel = () => showSmsInput ? (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
      <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
      <input
        type="tel"
        placeholder="+1 (555) 123-4567"
        value={smsPhone}
        onChange={(e) => setSmsPhone(e.target.value)}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        onKeyDown={(e) => { if (e.key === 'Enter') sendContactsViaSms() }}
      />
      <Button
        onClick={sendContactsViaSms}
        disabled={isSending || !smsPhone.trim()}
        size="sm"
      >
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
      </Button>
      <Button
        onClick={() => { setShowSmsInput(false); setSmsPhone('') }}
        variant="ghost"
        size="sm"
      >
        Cancel
      </Button>
    </div>
  ) : null

  if (isLoading) {
    const loadingContent = (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-3 rounded-lg border p-3"
          >
            <div className="h-4 w-4 rounded bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
    return layout === 'card' ? (
      <Card>
        <CardHeader>
          <Header />
        </CardHeader>
        <CardContent>{loadingContent}</CardContent>
      </Card>
    ) : (
      <div className="space-y-3">
        <Header />
        {loadingContent}
      </div>
    )
  }

  if (!members || members.length === 0) {
    const emptyContent = (
      <div className="text-center py-6">
        <Users className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No members have joined this group yet.
        </p>
      </div>
    )
    return layout === 'card' ? (
      <Card>
        <CardHeader>
          <Header />
        </CardHeader>
        <CardContent>{emptyContent}</CardContent>
      </Card>
    ) : (
      <div className="space-y-3">
        <Header />
        {emptyContent}
      </div>
    )
  }

  const content = (
    <div className="space-y-4">
      {/* SMS Panel */}
      <SmsPanel />

      {/* Select All Checkbox */}
      <div className="flex items-center space-x-2 pb-2 border-b">
        <Checkbox
          id="select-all"
          checked={selectedMembers.length === members.length}
          onCheckedChange={toggleSelectAll}
        />
        <label
          htmlFor="select-all"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Select All Members
        </label>
      </div>

      {/* Member List */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Checkbox
                id={`member-${member.id}`}
                checked={selectedMembers.includes(member.id)}
                onCheckedChange={() => toggleMemberSelection(member.id)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getDisplayName(member)}</span>
                  {member.is_owner && (
                    <Badge variant="secondary" className="text-xs">
                      Owner
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {member.email}
                  {member.phone && ` • ${member.phone}`}
                </div>
              </div>
            </div>
            {isIOS ? (
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportSingleContact(member, 'direct')}
                  disabled={isExporting}
                  title="Open in Contacts app"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportSingleContact(member, 'share')}
                  disabled={isExporting}
                  title="Share via iOS share sheet"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportSingleContact(member)}
                disabled={isExporting}
                className="shrink-0"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

    </div>
  )

  return layout === 'card' ? (
    <Card>
      <CardHeader>
        <Header />
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  ) : (
    <div className="space-y-4">
      <Header />
      {content}
    </div>
  )
}
