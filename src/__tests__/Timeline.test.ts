import youtubeTimeline from '../index';

describe('Youtube Timeline', () => {
  it('No errors', async () => {
    const timeline = await youtubeTimeline('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'high', 5);
    expect(timeline).toBeDefined();
  });
});
