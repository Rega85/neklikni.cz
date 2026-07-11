// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import VerdictCard, { type VerdictCardProps } from './VerdictCard'

afterEach(cleanup)

const greenProps: VerdictCardProps = {
  inputKind: 'message',
  level: 'green',
  score: 10,
  headline: 'Nenašli jsme významné rizikové signály.',
  actions: ['I tak buďte obezřetní u plateb předem.', 'V případě pochybností ověřte protistranu v naší databázi.'],
  sources: {
    database: null,
    ai: {
      risk: 5,
      verdict: 'OK',
      analysis: 'Zpráva vypadá neutrálně, bez podezřelých prvků.',
      threats: [],
      recommendation: 'Není třeba nic dělat.',
    },
  },
}

const orangeProps: VerdictCardProps = {
  inputKind: 'identifier',
  level: 'orange',
  score: 65,
  headline: 'Tento údaj se objevil v komunitním nahlášení, které zatím nebylo ověřeno.',
  actions: ['Buďte opatrní — ověřte protistranu jiným způsobem.', 'Než pošlete peníze, zkontrolujte identifikátor v databázi.'],
  sources: {
    database: {
      coi_matches: [],
      identifier_matches: [
        { type: 'phone', value_masked: '+420 7** *** *56', verified: false, incident_count: 2, trust_score: 40 },
      ],
    },
    ai: null,
  },
}

const redProps: VerdictCardProps = {
  inputKind: 'url',
  level: 'red',
  score: 92,
  headline: 'Tento e-shop (evil.cz) je na seznamu rizikových e-shopů ČOI.',
  actions: ['Nereagujte a neposílejte žádné peníze ani osobní údaje.', 'Nahlaste to do naší databáze.'],
  sources: {
    database: {
      coi_matches: [
        { domain: 'evil.cz', reason: 'Anonymní provozovatel.', category: 'anonymni_provozovatel', source: 'ČOI', source_url: null },
      ],
      identifier_matches: [],
    },
    ai: null,
  },
}

describe('VerdictCard', () => {
  it('green: renderuje headline, actions a nízké riziko', () => {
    render(<VerdictCard {...greenProps} />)
    expect(screen.getByTestId('verdict-card').getAttribute('data-level')).toBe('green')
    expect(screen.getByText(greenProps.headline)).toBeTruthy()
    expect(screen.getByText('Nízké riziko')).toBeTruthy()
    expect(screen.getByText(greenProps.actions[0])).toBeTruthy()
  })

  it('orange: renderuje headline a zvýšené riziko', () => {
    render(<VerdictCard {...orangeProps} />)
    expect(screen.getByTestId('verdict-card').getAttribute('data-level')).toBe('orange')
    expect(screen.getByText(orangeProps.headline)).toBeTruthy()
    expect(screen.getByText('Střední riziko')).toBeTruthy()
  })

  it('red: renderuje headline a vysoké riziko', () => {
    render(<VerdictCard {...redProps} />)
    expect(screen.getByTestId('verdict-card').getAttribute('data-level')).toBe('red')
    expect(screen.getByText(redProps.headline)).toBeTruthy()
    expect(screen.getByText('Vysoké riziko')).toBeTruthy()
  })

  it('detaily jsou skryté, dokud se nerozklikne "Zobrazit detaily"', () => {
    render(<VerdictCard {...redProps} />)
    expect(screen.queryByText('evil.cz')).toBeNull()
    fireEvent.click(screen.getByText('Zobrazit detaily'))
    expect(screen.getByText('evil.cz')).toBeTruthy()
  })

  it('odlišuje ověřenou shodu od komunitního nahlášení (orange = neověřeno)', () => {
    render(<VerdictCard {...orangeProps} />)
    fireEvent.click(screen.getByText('Zobrazit detaily'))
    expect(screen.getByText('Komunitní nahlášení (neověřeno)')).toBeTruthy()
  })

  it('AI sekce vysvětlí, proč se AI nevolala u holého identifikátoru', () => {
    render(<VerdictCard {...orangeProps} />)
    fireEvent.click(screen.getByText('Zobrazit detaily'))
    expect(screen.getByText(/AI se u holého identifikátoru/)).toBeTruthy()
  })
})
