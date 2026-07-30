import * as crypto from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createLogger } from '@ideia/logger'
import {
  InTotoLayout, InTotoStep, InTotoSignature,
  StepResult, VerificationResult,
} from './types'

const log = createLogger('in-toto-verifier')

export class InTotoVerifier {
  async verifyLayout(layoutPath: string, linkDir: string): Promise<VerificationResult> {
    try {
      if (!existsSync(layoutPath)) {
        return { totalSteps: 0, passed: 0, failed: 0, steps: [], verified: false }
      }
      const layout: InTotoLayout = JSON.parse(readFileSync(layoutPath, 'utf-8'))
      const results: StepResult[] = []

      for (const step of layout.steps) {
        const linkPath = resolve(linkDir, `${step.name}.link`)
        if (!existsSync(linkPath)) {
          results.push({ step: step.name, passed: false, error: 'Link file not found' })
          continue
        }

        const link = JSON.parse(readFileSync(linkPath, 'utf-8'))
        const verification = this._verifyStep(step, link, layout.keys)
        results.push(verification)

        if (!verification.passed) {
          log.error(`Step ${step.name} verification failed`, { error: verification.error })
        }
      }

      return {
        totalSteps: layout.steps.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        steps: results,
        verified: results.every(r => r.passed),
      }
    } catch {
      return { totalSteps: 0, passed: 0, failed: 0, steps: [], verified: false }
    }
  }

  private _verifyStep(
    step: InTotoStep,
    link: any,
    keys: Record<string, { keyval: { public: string } }>,
  ): StepResult {
    if (!link.signatures?.length) {
      return { step: step.name, passed: false, error: 'No signatures' }
    }

    for (const sig of link.signatures) {
      const key = keys[sig.keyid]
      if (!key) {
        return { step: step.name, passed: false, error: `Key ${sig.keyid} not found in layout` }
      }
      const verified = this._verifySignature(
        JSON.stringify(link.signed),
        sig.sig,
        key.keyval.public,
      )
      if (!verified) {
        return { step: step.name, passed: false, error: `Invalid signature from key ${sig.keyid}` }
      }
    }

    if (step.materials?.length) {
      const materialsMatch = step.materials.every(m =>
        link.signed.materials?.some((lm: any) => lm.uri === m),
      )
      if (!materialsMatch) {
        return { step: step.name, passed: false, error: 'Materials mismatch' }
      }
    }

    if (step.products?.length) {
      const productsMatch = step.products.every(p =>
        link.signed.products?.some((lp: any) => lp.uri === p),
      )
      if (!productsMatch) {
        return { step: step.name, passed: false, error: 'Products mismatch' }
      }
    }

    return { step: step.name, passed: true }
  }

  private _verifySignature(payload: string, signatureB64: string, publicKeyPEM: string): boolean {
    try {
      const verifier = crypto.createVerify('SHA384')
      verifier.update(payload)
      return verifier.verify(publicKeyPEM, Buffer.from(signatureB64, 'base64'))
    } catch {
      return false
    }
  }
}
