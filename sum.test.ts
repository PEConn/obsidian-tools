import {describe, expect, test } from '@jest/globals'
import { sum } from "./sum";

describe('sum module', () => {
    test('works', () => {
        expect(sum(1, 2)).toBe(3);
    })
})