import crypto from 'crypto';

export function generateToken04(appId, userId, secret, effectiveTimeInSeconds, payload = '') {
    if (!appId || typeof appId !== 'number') {
        throw new Error('appId invalid');
    }
    if (!userId || typeof userId !== 'string') {
        throw new Error('userId invalid');
    }
    if (!secret || typeof secret !== 'string' || secret.length !== 32) {
        throw new Error('secret must be a 32 byte string');
    }
    if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== 'number') {
        throw new Error('effectiveTimeInSeconds invalid');
    }
    const createTime = Math.floor(new Date().getTime() / 1000);
    const tokenInfo = {
        app_id: appId,
        user_id: userId,
        nonce: Math.floor(Math.random() * 2147483647),
        ctime: createTime,
        expire: createTime + effectiveTimeInSeconds,
        payload: payload
    };
    const plaintText = JSON.stringify(tokenInfo);
    
    // iv: 16 bytes random string
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(secret);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plaintText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const b1 = Buffer.alloc(8);
    const b2 = Buffer.alloc(2);
    const b3 = Buffer.alloc(2);
    
    b1.writeBigInt64BE(BigInt(tokenInfo.expire), 0);
    b2.writeUInt16BE(iv.length, 0);
    b3.writeUInt16BE(Buffer.byteLength(encrypted), 0);
    
    const buf = Buffer.concat([
        b1,
        b2,
        iv,
        b3,
        Buffer.from(encrypted)
    ]);
    
    return '04' + Buffer.from(buf).toString('base64');
}
