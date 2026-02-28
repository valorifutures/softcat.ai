const colors = ['green', 'cyan', 'purple', 'amber'] as const;

export function tagColor(tag: string): (typeof colors)[number] {
  let h = 0x9e3779b9;
  for (let i = 0; i < tag.length; i++) {
    h += tag.charCodeAt(i);
    h += h << 10;
    h ^= h >>> 6;
  }
  h += h << 3;
  h ^= h >>> 11;
  h += h << 15;
  return colors[(h >>> 0) % colors.length];
}

export function tagDotClass(tag: string): string {
  return `tag-dot-${tagColor(tag)}`;
}
