import { describe, expect, it } from "vitest";
import { ValueList } from "../../src/lib/collection/ValueList";

describe('ValueList', () => {

    it('manages elements and evicts oldest correctly with a capacity of 3', () => {
        const xs = new ValueList<number>(3, 10);

        xs.add(1);
        xs.add(2);
        xs.insert(1, -1);
        expect(Array.from(xs)).toEqual([1, -1, 2]);

        xs.add(4);
        expect(Array.from(xs)).toEqual([-1, 2, 4]);

        xs.insert(1, -2);
        expect(Array.from(xs)).toEqual([-2, 2, 4]);

        xs.add(5);
        expect(Array.from(xs)).toEqual([2, 4, 5]);

        // Assert specific index access
        expect(xs.get(0)).toBe(2);
    });

    it('manages elements and evicts oldest correctly with a capacity of 4', () => {
        const xs = new ValueList<number>(4, 10);

        xs.add(1);
        xs.add(2);
        xs.insert(1, -1);
        expect(Array.from(xs)).toEqual([1, -1, 2]);

        xs.add(4);
        xs.add(5);
        expect(Array.from(xs)).toEqual([-1, 2, 4, 5]);

        xs.insert(1, -2);
        expect(Array.from(xs)).toEqual([-2, 2, 4, 5]);

        xs.insert(2, -3);
        expect(Array.from(xs)).toEqual([2, -3, 4, 5]);

        xs.add(6);
        expect(Array.from(xs)).toEqual([-3, 4, 5, 6]);

        xs.insert(3, 7);
        expect(Array.from(xs)).toEqual([4, 5, 7, 6]);

        xs.insert(2, 8);
        expect(Array.from(xs)).toEqual([5, 8, 7, 6]);
    });

    it('handles no limit capacity (dynamic sizing)', () => {
        // Assuming the default constructor allows for unbounded/growing capacity
        const xs = new ValueList<number>();

        xs.insert(0, -1);
        xs.insert(0, -2);
        xs.add(1);
        expect(Array.from(xs)).toEqual([-2, -1, 1]);

        xs.add(2);
        xs.insert(1, 3);
        expect(Array.from(xs)).toEqual([-2, 3, -1, 1, 2]);

        expect(xs.get(0)).toBe(-2);
        expect(xs.get(1)).toBe(3);
    });
});