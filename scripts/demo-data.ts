// Original geometric test animation. Uses the public SSFB schema; it does not
// redistribute SpriteStudio's separately licensed character sample artwork.
import { Builder } from 'flatbuffers';
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { ProjectData } from '../vendor/ss6player/ssfblib/ss/ssfb/project-data';
import { CellMap } from '../vendor/ss6player/ssfblib/ss/ssfb/cell-map';
import { Cell } from '../vendor/ss6player/ssfblib/ss/ssfb/cell';
import { PartData } from '../vendor/ss6player/ssfblib/ss/ssfb/part-data';
import { AnimePackData } from '../vendor/ss6player/ssfblib/ss/ssfb/anime-pack-data';
import { AnimationData } from '../vendor/ss6player/ssfblib/ss/ssfb/animation-data';
import { AnimationInitialData } from '../vendor/ss6player/ssfblib/ss/ssfb/animation-initial-data';
import { frameDataIndex } from '../vendor/ss6player/ssfblib/ss/ssfb/frame-data-index';
import { partState } from '../vendor/ss6player/ssfblib/ss/ssfb/part-state';
import { SsPartType } from '../vendor/ss6player/ssfblib/ss/ssfb/ss-part-type';
import { PART_FLAG } from '../vendor/ss6player/ssfblib/ss/ssfb/part-flag';

const b = new Builder(16384);
const text = (value: string) => b.createString(value);
const cellmap = CellMap.createCellMap(b, text('mark'), text('mark.png'), 0, 0, 1);
const cellName = text('mark');
Cell.startCell(b);
Cell.addName(b, cellName); Cell.addCellMap(b, cellmap);
Cell.addWidth(b, 128); Cell.addHeight(b, 128); Cell.addU2(b, 1); Cell.addV2(b, 1);
const cell = Cell.endCell(b);
const part = PartData.createPartData(b, text('mark'), 0, -1, SsPartType.Normal, 0, 0, 0, 0, 0, 0);

AnimationInitialData.startAnimationInitialData(b);
AnimationInitialData.addCellIndex(b, 0);
AnimationInitialData.addOpacity(b, 255); AnimationInitialData.addLocalopacity(b, 255);
AnimationInitialData.addScaleX(b, 1); AnimationInitialData.addScaleY(b, 1);
AnimationInitialData.addLocalscaleX(b, 1); AnimationInitialData.addLocalscaleY(b, 1);
AnimationInitialData.addSizeX(b, 128); AnimationInitialData.addSizeY(b, 128);
AnimationInitialData.addUvScaleX(b, 1); AnimationInitialData.addUvScaleY(b, 1);
const initial = AnimationInitialData.endAnimationInitialData(b);
const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
const bits = (value: number) => { f32[0] = value; return u32[0]; };

function animation(name: string, rotation: boolean) {
  const frames = [];
  for (let i = 0; i < 60; i++) {
    const data = partState.createDataVector(b, [bits(Math.sin(i * Math.PI / 30) * 12), bits(rotation ? i * 6 : 0)]);
    const state = partState.createpartState(b, 0, PART_FLAG.POSITION_Y | PART_FLAG.ROTATIONZ, 0, data);
    frames.push(frameDataIndex.createframeDataIndex(b, frameDataIndex.createStatesVector(b, [state])));
  }
  const defaults = AnimationData.createDefaultDataVector(b, [initial]);
  const frameVector = AnimationData.createFrameDataVector(b, frames);
  return AnimationData.createAnimationData(b, text(name), defaults, frameVector, 0, 0, 0, 0, 0, 59, 60, 30, 0, 320, 320, 0, 0);
}
const animations = [animation('idle', false), animation('spin', true)];
const pack = AnimePackData.createAnimePackData(b, text('demo'), AnimePackData.createPartsVector(b, [part]), AnimePackData.createAnimationsVector(b, animations));
const cells = ProjectData.createCellsVector(b, [cell]);
const packs = ProjectData.createAnimePacksVector(b, [pack]);
ProjectData.startProjectData(b);
ProjectData.addDataId(b, 0x42505353); ProjectData.addVersion(b, 10);
ProjectData.addCells(b, cells); ProjectData.addAnimePacks(b, packs);
ProjectData.addNumCells(b, 1); ProjectData.addNumAnimePacks(b, 1);
ProjectData.finishProjectDataBuffer(b, ProjectData.endProjectData(b));

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Buffer) {
  const tag = Buffer.from(name);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([len, tag, data, checksum]);
}
function png(green = false) {
  const rows = Buffer.alloc(128 * (1 + 128 * 4));
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const r = Math.hypot(x - 63.5, y - 63.5);
    const inside = r < 53;
    const offset = y * 513 + 1 + x * 4;
    const stripe = Math.abs(x + y - 127) < 12;
    rows[offset] = stripe ? 238 : green ? 59 : 34;
    rows[offset + 1] = stripe ? 246 : green ? 216 : 164;
    rows[offset + 2] = stripe ? 255 : green ? 146 : 236;
    rows[offset + 3] = inside ? 255 : 0;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(128, 0); header.writeUInt32BE(128, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
for (const [dir, green] of [['demo', false], ['demo-green', true]] as const) {
  const path = `data/others/spritestudio/${dir}`;
  await mkdir(path, { recursive: true });
  await writeFile(`${path}/demo.ssfb`, b.asUint8Array());
  await writeFile(`${path}/mark.png`, png(green));
}
