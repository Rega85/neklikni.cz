// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import LimitReachedCard from './LimitReachedCard'

afterEach(cleanup)

describe('LimitReachedCard', () => {
  it('renderuje hlášku bez viny a obě CTA podle nového ceníku', () => {
    render(<LimitReachedCard message="Denní limit 2 AI ověření zdarma je vyčerpán." />)

    expect(screen.getByTestId('limit-reached-card')).toBeTruthy()
    expect(screen.getByText('Dnešní ověření zdarma jsi vyčerpal.')).toBeTruthy()
    expect(screen.getByText('Denní limit 2 AI ověření zdarma je vyčerpán.')).toBeTruthy()

    const oneshotLink = screen.getByText(/Jednorázová analýza za 49 Kč/) as HTMLElement
    expect(oneshotLink.closest('a')?.getAttribute('href')).toBe('/pricing?plan=oneshot')

    const fullLink = screen.getByText(/neomezené ověřování za 79 Kč\/měsíc/) as HTMLElement
    expect(fullLink.closest('a')?.getAttribute('href')).toBe('/pricing')

    expect(screen.getByText('Vyhledávání v databázi máš dál zdarma.')).toBeTruthy()
  })

  it('funguje i bez volitelné message', () => {
    render(<LimitReachedCard />)
    expect(screen.getByText('Dnešní ověření zdarma jsi vyčerpal.')).toBeTruthy()
  })
})
