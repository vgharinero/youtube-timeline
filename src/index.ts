import axios from 'axios';

import * as ytdl from 'ytdl-core';
import * as sharp from 'sharp';

import mergeBase64 = require('merge-base64');

type Base64Image = string;

type FrameDetails = {
  url: string;
  x: number;
  y: number;
};

type CropSettings = {
  width: number;
  height: number;
  left: number;
  top: number;
};

type StoryboardQuality = 'low' | 'medium' | 'high';

type Timeline = Base64Image | undefined;

const parseStoryboardQuality = (quality: StoryboardQuality) => {
  const qualityNumber = {
    low: 0,
    medium: 1,
    high: 2,
  };
  return qualityNumber[quality];
};

const evenlyDistributedElements = <T>(array: T[], quantity: number) => {
  if (quantity === 0) return [];
  if (quantity >= array.length) return [...array];

  const interval = array.length / quantity;
  return Array.from({ length: quantity }, (_, i) => array[Math.floor(i * interval + interval / 2)]);
};

const getFramesDetails = (
  quantity: number,
  templateUrl: string,
  thumbnailCount: number,
  thumbnailWidth: number,
  thumbnailHeight: number,
): FrameDetails[] => {
  const COLUMNS = 5;
  const ROWS = 5;

  const selectedFrames = evenlyDistributedElements(
    Array.from({ length: thumbnailCount }).map((_, i) => i),
    quantity,
  );

  return selectedFrames.map((frameIndex) => {
    const storyboardIndex = Math.floor(frameIndex / (COLUMNS * ROWS));
    const url = templateUrl.replace('$M', String(storyboardIndex));

    const thumbnailIndex = frameIndex - storyboardIndex * (COLUMNS * ROWS);
    const x = (thumbnailIndex % COLUMNS) * thumbnailWidth;
    const y = Math.floor(thumbnailIndex / ROWS) * thumbnailHeight;

    return { url, x, y };
  });
};

const cropImage = async (url: string, cropSettings: CropSettings): Promise<Base64Image> => {
  const imageResponse = await axios({ url, responseType: 'arraybuffer' });
  const buffer = Buffer.from(imageResponse.data, 'binary');
  return (await sharp(buffer).extract(cropSettings).toFormat('jpeg').toBuffer()).toString('base64');
};

const mergeImages = async (images: Base64Image[]): Promise<Base64Image> => await mergeBase64(images);

const getTimeline = async (url: string, quality: StoryboardQuality, quantity: number): Promise<Timeline> => {
  if (quantity <= 0) return undefined;

  const videoData = await ytdl.getInfo(url);
  const qualityNumber = parseStoryboardQuality(quality);

  const { templateUrl, thumbnailCount, thumbnailHeight, thumbnailWidth } =
    videoData.videoDetails.storyboards[qualityNumber];
  const framesDetails = getFramesDetails(quantity, templateUrl, thumbnailCount, thumbnailWidth, thumbnailHeight);

  const frames = await Promise.all(
    framesDetails.map(
      async (frame) =>
        await cropImage(frame.url, { width: thumbnailWidth, height: thumbnailHeight, left: frame.x, top: frame.y }),
    ),
  );
  const timeline = await mergeImages(frames);

  return timeline;
};

export default getTimeline;
