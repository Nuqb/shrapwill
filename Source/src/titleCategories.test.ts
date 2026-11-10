import { describe, expect, it } from 'vitest';
import { titlePresets } from './features/library/presets';
import {
  categoryContains,
  titleCategories,
  titleCategoryId,
  titleCategoryNames,
} from './features/library/titleCategories';

describe('Filmora title navigation', () => {
  it('keeps the current Filmora parent and text-type order', () => {
    expect(titleCategories.map((category) => category.name)).toEqual([
      'Title Effects',
      'Title Templates',
    ]);
    expect(titleCategories[0].children.map((category) => category.name)).toEqual([
      'Trending',
      'Minimal',
      'Typing Effect',
      'WordArt',
      'Stylized FX',
      'Glow Text',
      '3D Titles',
      'Cinematic',
      'Handwriting',
      'Glitch',
      'Neon',
      'Audio Driven Text',
    ]);
    expect(titleCategories[1].children.map((category) => category.name)).toEqual([
      'Lower Thirds',
      'Subtitles',
      'Social Media',
      'News',
      'Callout',
      'End Credits',
      'Music',
      'Halloween',
      'Search Bar',
      'Chapter',
      'Message',
      'Awards',
      'Real Estate',
      'Games',
      'Sports',
      'Love & Romance',
      'Openers',
      'Birthday',
      'Promo',
      'Slideshow',
      'Thanksgiving Day',
      'Christmas',
      'New Year',
    ]);
  });

  it('preserves nested text types and routes every existing title to one parent', () => {
    expect(
      titleCategories[0].children
        .find((category) => category.name === 'WordArt')!
        .children.map((category) => category.name),
    ).toEqual([
      'Multicolor',
      'Yellow',
      'Red',
      'Black&White',
      'Manuscript',
      'Blue',
      'Green',
      'Purple',
      'Pink',
    ]);
    for (const preset of titlePresets) {
      const id = titleCategoryId(preset);
      expect(titleCategories.filter((category) => categoryContains(category, id))).toHaveLength(1);
      expect(titleCategoryNames(id).length).toBeGreaterThan(1);
    }
    expect(
      titleCategoryNames(titleCategoryId(titlePresets.find((preset) => preset.style === 'neon')!)),
    ).toEqual(['Title Effects', 'Neon']);
  });
});
