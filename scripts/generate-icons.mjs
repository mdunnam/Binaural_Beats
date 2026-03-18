import sharp from 'sharp';

const src = 'app/public/icons/logoc_512.png';

await sharp(src).resize(512, 512).png().toFile('app/public/icons/icon-512.png');
console.log('✅ icon-512.png');

await sharp(src).resize(192, 192).png().toFile('app/public/icons/icon-192.png');
console.log('✅ icon-192.png');

await sharp(src).resize(32, 32).png().toFile('app/public/favicon.png');
console.log('✅ favicon.png');

console.log('Done — all icons regenerated from logoc_512.png');
