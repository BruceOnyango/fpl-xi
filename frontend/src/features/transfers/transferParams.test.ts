import { parseTransfers, serializeTransfers } from './transferParams';

describe('transfer URL params', () => {
  it('round-trips', () => {
    const pairs = [
      { outId: 1, inId: 2 },
      { outId: 3, inId: 4 },
    ];
    expect(parseTransfers(serializeTransfers(pairs))).toEqual(pairs);
  });

  it('drops malformed and duplicate entries', () => {
    expect(parseTransfers('1-2,junk,1-5,7-2,9-9,3-4')).toEqual([
      { outId: 1, inId: 2 },
      { outId: 3, inId: 4 },
    ]);
    expect(parseTransfers(null)).toEqual([]);
  });
});
