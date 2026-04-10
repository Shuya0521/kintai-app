import { describe, it, expect } from 'vitest'
import { isAdminRole, isApproverRole, getApproverRoles } from '../../../src/auth/roles'
import { ADMIN_ROLES, APPROVER_ROLES } from '../../../src/constants'

describe('isAdminRole', () => {
  it('R-01: "部長" → true', () => {
    expect(isAdminRole('部長')).toBe(true)
  })

  it('R-02: "社員" → false', () => {
    expect(isAdminRole('社員')).toBe(false)
  })

  it('R-03: ADMIN_ROLESの全メンバー → true', () => {
    for (const role of ADMIN_ROLES) {
      expect(isAdminRole(role)).toBe(true)
    }
  })

  it('R-02b: "リーダー" → false', () => {
    expect(isAdminRole('リーダー')).toBe(false)
  })

  it('R-02c: "主査" → false', () => {
    expect(isAdminRole('主査')).toBe(false)
  })

  it('R-02d: 空文字 → false', () => {
    expect(isAdminRole('')).toBe(false)
  })
})

describe('isApproverRole', () => {
  it('R-04: "部長" → true', () => {
    expect(isApproverRole('部長')).toBe(true)
  })

  it('R-05: "課長" → false', () => {
    expect(isApproverRole('課長')).toBe(false)
  })

  it('R-04b: APPROVER_ROLES全て → true', () => {
    for (const role of APPROVER_ROLES) {
      expect(isApproverRole(role)).toBe(true)
    }
  })
})

describe('getApproverRoles', () => {
  it('R-06: "社員" → ["部長"]', () => {
    expect(getApproverRoles('社員')).toEqual(['部長'])
  })

  it('R-07: "部長" → ["取締役"]（統括部長不在のため）', () => {
    expect(getApproverRoles('部長')).toEqual(['取締役'])
  })

  it('R-08: "統括部長" → []', () => {
    expect(getApproverRoles('統括部長')).toEqual([])
  })

  it('R-06b: "リーダー" → ["部長"]', () => {
    expect(getApproverRoles('リーダー')).toEqual(['部長'])
  })

  it('R-06c: "課長" → ["部長"]', () => {
    expect(getApproverRoles('課長')).toEqual(['部長'])
  })
})
