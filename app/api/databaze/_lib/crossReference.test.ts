import { describe, expect, it } from 'vitest'
import { isQualifyingIncident } from './crossReference'
import type { IncidentStatus } from '@/types/databaze'

describe('isQualifyingIncident', () => {
  it('subjekt s jediným removed incidentem nemá žádný kvalifikující incident', () => {
    const incidents: Array<{ status: IncidentStatus; resolution_status: string }> = [
      { status: 'removed', resolution_status: 'active' },
    ]
    expect(incidents.some(isQualifyingIncident)).toBe(false)
  })

  it('zamítnutí posledního kvalifikujícího incidentu (published -> removed) sníží count na 0', () => {
    const before: Array<{ status: IncidentStatus; resolution_status: string }> = [
      { status: 'published', resolution_status: 'active' },
    ]
    const after: Array<{ status: IncidentStatus; resolution_status: string }> = [
      { status: 'removed', resolution_status: 'active' },
    ]
    expect(before.filter(isQualifyingIncident).length).toBe(1)
    expect(after.filter(isQualifyingIncident).length).toBe(0)
  })

  it('subjekt s 1 published + 1 removed má pořád 1 kvalifikující incident (found zůstává true)', () => {
    const incidents: Array<{ status: IncidentStatus; resolution_status: string }> = [
      { status: 'published', resolution_status: 'active' },
      { status: 'removed', resolution_status: 'active' },
    ]
    expect(incidents.filter(isQualifyingIncident).length).toBe(1)
  })

  it('notified se počítá stejně jako published', () => {
    expect(isQualifyingIncident({ status: 'notified', resolution_status: 'active' })).toBe(true)
  })

  it('smírně stažený (withdrawn) incident nekvalifikuje, i když je published', () => {
    expect(isQualifyingIncident({ status: 'published', resolution_status: 'withdrawn' })).toBe(false)
  })

  it('pending/needs_more_info/ai_reviewed nekvalifikují (čekají na moderaci)', () => {
    expect(isQualifyingIncident({ status: 'pending', resolution_status: 'active' })).toBe(false)
    expect(isQualifyingIncident({ status: 'needs_more_info', resolution_status: 'active' })).toBe(false)
    expect(isQualifyingIncident({ status: 'ai_reviewed', resolution_status: 'active' })).toBe(false)
  })
})
