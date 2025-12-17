import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, LevelData, Entity, TileType, Particle, InputState, Vector2 } from '../types';
import { LEVELS, TILE_SIZE, GRAVITY, UNDERWATER_GRAVITY, MOVE_SPEED, JUMP_FORCE, SWIM_FORCE, ACCELERATION, AIR_ACCELERATION, WATER_ACCELERATION, FRICTION, AIR_FRICTION, WATER_FRICTION, TERMINAL_VELOCITY, TERMINAL_VELOCITY_WATER, GOOMBA_SPEED, SPINY_SPEED, MUSHROOM_SPEED, STAR_SPEED, FIREBALL_SPEED, BOO_SPEED } from '../constants';
import { parseMap, resolveMapCollision, checkRectCollision, handleBlockInteraction, isSolid } from '../utils/physics';
import { Trophy, Skull, Coins, Timer, ArrowRight, RotateCcw, Heart, Zap, Flame, User, Ghost, Bot, Flame as FlameIcon, Flag, Pause, Play, Menu, X, Gamepad2, Layers } from 'lucide-react';
import { initAudio, playJump, playShoot, playCoin, playPowerUp, playPowerUpAppears, playStomp, playDamage, playBreak, playBump, playLevelClear, playWin } from '../utils/audio';

// --- Sub-components for Rendering ---

const RenderTile = React.memo(({ type, x, y, theme }: { type: TileType, x: number, y: number, theme: string }) => {
    const style = { left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
    
    switch (type) {
        case 'GROUND': 
            if (theme === 'CASTLE') {
                return <div className="absolute bg-stone-600 border-t-4 border-stone-500 rounded-sm shadow-sm" style={style} />;
            }
            return <div className="absolute bg-green-600 border-t-4 border-green-500 rounded-sm shadow-sm" style={style} />;
        case 'HARD_BLOCK': return <div className="absolute bg-stone-700 border-2 border-stone-800" style={style} />;
        case 'BRICK': 
            return (
                <div className="absolute bg-orange-700 border border-orange-900 shadow-inner" style={style}>
                    <div className="w-full h-full border-2 border-dashed border-orange-800 opacity-50" />
                    <div className="absolute top-1 left-1 w-1 h-1 bg-black opacity-20" />
                    <div className="absolute bottom-1 right-1 w-1 h-1 bg-black opacity-20" />
                </div>
            );
        case 'QUESTION': 
        case 'QUESTION_MUSHROOM': 
        case 'QUESTION_FLOWER':
        case 'QUESTION_STAR':
            return (
                 <div className="absolute" style={style}>
                    <div className="w-full h-full bg-yellow-400 border-2 border-yellow-600 rounded-sm shadow-md flex items-center justify-center animate-question relative">
                        {/* Corner bolts */}
                        <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-yellow-800 opacity-50 rounded-full" />
                        <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-yellow-800 opacity-50 rounded-full" />
                        <div className="absolute bottom-0.5 left-0.5 w-1 h-1 bg-yellow-800 opacity-50 rounded-full" />
                        <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-yellow-800 opacity-50 rounded-full" />
                        <span className="font-mono font-bold text-yellow-800 text-lg drop-shadow-sm">?</span>
                    </div>
                </div>
            );
        case 'QUESTION_HIT': return <div className="absolute bg-yellow-700 border-2 border-yellow-900 rounded-sm" style={style} />;
        case 'PIPE_L': return <div className="absolute bg-gradient-to-r from-green-600 to-green-500 border-l-4 border-green-800" style={style} />;
        case 'PIPE_R': return <div className="absolute bg-gradient-to-l from-green-600 to-green-500 border-r-4 border-green-800" style={style} />;
        case 'PIPE_TOP_L': return <div className="absolute bg-green-500 border-4 border-green-800" style={{...style, height: TILE_SIZE}} />;
        case 'PIPE_TOP_R': return <div className="absolute bg-green-500 border-4 border-green-800" style={{...style, height: TILE_SIZE}} />;
        case 'FLAG_POLE': return <div className="absolute bg-white w-2 left-1/2 -ml-1" style={{ left: x*TILE_SIZE + TILE_SIZE/2, top: y*TILE_SIZE, height: TILE_SIZE, width: 4 }} />;
        case 'FLAG_TOP': return <div className="absolute bg-yellow-400 rounded-full" style={{ left: x*TILE_SIZE + 4, top: y*TILE_SIZE, width: TILE_SIZE-8, height: TILE_SIZE-8 }} />;
        case 'CORAL': 
            return (
                <div className="absolute" style={style}>
                     <div className="w-full h-full flex items-end justify-center gap-1 opacity-80">
                         <div className="w-2 h-4/5 bg-pink-400 rounded-t-full" />
                         <div className="w-2 h-3/5 bg-purple-400 rounded-t-full" />
                         <div className="w-2 h-1/2 bg-pink-600 rounded-t-full" />
                     </div>
                </div>
            );
        default: return null;
    }
});

const ParallaxBackground = ({ level, cameraX, isUnderwater }: { level: number, cameraX: number, isUnderwater?: boolean }) => {
    let bgGradient = 'from-sky-400 to-blue-200';
    
    if (isUnderwater) {
        bgGradient = 'from-blue-900 to-cyan-600';
    } else if (level === 2) { // Volcano/Castle dark
         bgGradient = 'from-orange-900 via-stone-900 to-black';
    }

    return (
        <div className={`absolute inset-0 w-full h-full overflow-hidden bg-gradient-to-b ${bgGradient} z-0`}>
             <style>{`
                @keyframes cloud-drift-1 { from { background-position-x: 0px; } to { background-position-x: 1000px; } }
                @keyframes cloud-drift-2 { from { background-position-x: 0px; } to { background-position-x: 1200px; } }
                @keyframes star-twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
                @keyframes ember-rise { from { background-position-y: 100%; opacity: 0; } 50% { opacity: 1; } to { background-position-y: 0%; opacity: 0; } }
                @keyframes bubble-rise { from { transform: translateY(100vh) scale(0.5); opacity: 0; } 50% { opacity: 0.8; } to { transform: translateY(-20vh) scale(1.2); opacity: 0; } }
             `}</style>
             
             {/* Celestial Bodies */}
             {!isUnderwater && level === 0 && (
                <div className="absolute top-8 right-16 w-24 h-24 bg-yellow-300 rounded-full blur-xl opacity-80 mix-blend-screen animate-pulse" />
             )}
             
             {/* Bubbles for Underwater */}
             {isUnderwater && (
                 <>
                    {[...Array(15)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute rounded-full bg-white/20 border border-white/40"
                            style={{
                                left: `${Math.random() * 100}%`,
                                width: `${10 + Math.random() * 20}px`,
                                height: `${10 + Math.random() * 20}px`,
                                animation: `bubble-rise ${5 + Math.random() * 10}s linear infinite`,
                                animationDelay: `${Math.random() * 5}s`
                            }}
                        />
                    ))}
                 </>
             )}

             {/* Level 0: Day Clouds - REFINED */}
             {!isUnderwater && level === 0 && (
                 <>
                    {/* Slow back layer - softer, larger clouds */}
                    <div 
                        className="absolute inset-0 w-full h-full opacity-60"
                        style={{
                            backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, transparent 60%)`,
                            backgroundSize: '400px 200px',
                            backgroundPosition: '0 20px',
                            backgroundRepeat: 'repeat-x',
                            animation: 'cloud-drift-1 120s linear infinite'
                        }}
                    />
                    {/* Faster front layer - slightly smaller but soft */}
                    <div 
                        className="absolute inset-0 w-full h-full opacity-50"
                        style={{
                            backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, transparent 60%)`,
                            backgroundSize: '300px 150px',
                            backgroundPosition: '150px 60px',
                            backgroundRepeat: 'repeat-x',
                            animation: 'cloud-drift-2 90s linear infinite'
                        }}
                    />
                 </>
             )}

             {/* Level 2: Embers/Ash */}
             {level === 2 && (
                 <div 
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(2px 2px at 50% 50%, #f97316, transparent), radial-gradient(2px 2px at 20% 80%, #ef4444, transparent)',
                        backgroundSize: '100px 100px',
                        animation: 'ember-rise 5s linear infinite'
                    }}
                 />
             )}
             
             {/* Atmosphere Overlay (Fog/Haze) */}
             {level === 2 && <div className="absolute inset-0 bg-gradient-to-t from-orange-900/40 via-transparent to-transparent pointer-events-none" />}
             {isUnderwater && <div className="absolute inset-0 bg-blue-500/20 pointer-events-none mix-blend-multiply" />}
        </div>
    );
};

const RenderEntity: React.FC<{ entity: Entity, time: number, isUnderwater?: boolean }> = ({ entity, time, isUnderwater }) => {
    const isFacingLeft = entity.facing === -1;
    
    const baseStyle = { 
        left: entity.pos.x, 
        top: entity.pos.y, 
        width: entity.size.x, 
        height: entity.size.y,
        transition: 'none' // Disable CSS transition for smooth JS animation
    };

    // Generic Flashing for Invulnerability
    const isHurt = (entity.invulnerableTimer || 0) > 0;
    const hurtFilter = isHurt && Math.floor(time / 4) % 2 === 0 ? 'opacity-50 brightness-150 sepia' : '';

    // Apply squish transform if dying
    const isDying = entity.dying;
    const dyingStyle = isDying ? {
        transform: 'scaleY(0.2) translateY(30px)',
        opacity: 0.8,
        transition: 'transform 0.1s ease-out'
    } : {};
    
    // Merge dying style into base for transform-based enemies, but be careful not to override existing transforms
    // We'll handle it per entity type to be safe, or wrap the inner content

    if (entity.type === 'MARIO') {
        const isRun = Math.abs(entity.vel.x) > 0.5;
        const isJump = !entity.grounded;
        const health = entity.health || 1;
        const isBig = health > 1;
        const isFire = health === 3;
        const isStar = (entity.starTimer || 0) > 0;
        const isDying = entity.dying;

        // Dying Animation (Jump Fall)
        if (isDying) {
             return (
                 <div className="absolute will-change-transform z-50" style={{ ...baseStyle, filter: 'grayscale(100%)' }}>
                     <div className="relative w-full h-full">
                         {/* Dead Sprite Sim */}
                         <div className="absolute top-0 left-0 w-full h-full bg-red-600 rounded-sm" />
                         <div className="absolute top-1 left-1 w-2/3 h-1/3 bg-orange-200" />
                     </div>
                 </div>
             )
        }
        
        // Colors
        const hatColor = isFire ? 'bg-white' : 'bg-red-600';
        const shirtColor = isFire ? 'bg-white' : 'bg-red-600';
        const overallColor = isFire ? 'bg-red-600' : 'bg-blue-600';
        const starFilter = isStar ? `hue-rotate(${time * 10}deg)` : '';

        const runFrame = Math.floor(time / 5) % 3; // 0, 1, 2
        
        // Swim rotation
        const swimRotate = isUnderwater ? (isJump ? -45 : 45) : 0;
        
        return (
            <div 
                className={`absolute will-change-transform ${hurtFilter}`} 
                style={{
                    ...baseStyle,
                    transform: `${isFacingLeft ? 'scaleX(-1)' : 'scaleX(1)'} ${isUnderwater ? `rotate(${Math.min(20, Math.max(-20, entity.vel.y * 5))}deg)` : ''}`,
                    filter: `${starFilter}`
                }}
            >
                 {/* Body Group */}
                 <div className={`relative w-full h-full ${isJump && !isUnderwater ? 'scale-y-95' : ''}`}>
                    {/* Head */}
                     <div className={`absolute top-0 left-1 w-3/4 ${isBig ? 'h-1/4' : 'h-1/3'} ${hatColor} rounded-t-lg z-20 shadow-sm`} /> 
                     {/* Hat Brim */}
                     <div className={`absolute top-2 left-4 w-1/2 ${isBig ? 'h-4' : 'h-2'} ${hatColor} brightness-75 z-21 rounded-r-md`} />
                     {/* Face */}
                     <div className={`absolute ${isBig ? 'top-[20%]' : 'top-1/4'} left-2 w-2/3 h-1/4 bg-orange-200 z-10 rounded-sm`} /> 
                     {/* Nose */}
                     <div className={`absolute ${isBig ? 'top-[20%]' : 'top-1/4'} left-5 w-2 h-2 bg-orange-300 rounded-full z-11`} />
                     {/* Mustache */}
                     <div className={`absolute ${isBig ? 'top-[35%]' : 'top-[40%]'} left-4 w-3 h-1 bg-black rounded-full z-12`} />
                     {/* Torso */}
                     <div className={`absolute ${isBig ? 'top-[30%]' : 'top-1/3'} left-1/4 w-1/2 h-1/3 ${shirtColor} rounded-sm z-10`} />
                     {/* Overalls */}
                     <div className={`absolute top-1/2 left-1/4 w-1/2 ${isBig ? 'h-1/3' : 'h-1/4'} ${overallColor} z-11 border-t-2 border-blue-900/20`} />
                     {/* Buttons */}
                     <div className="absolute top-1/2 left-[30%] w-1.5 h-1.5 bg-yellow-400 rounded-full z-12" />
                     {/* Arms */}
                     <div 
                        className={`absolute ${isBig ? 'top-[30%]' : 'top-1/3'} left-0 w-2 ${isBig ? 'h-6' : 'h-4'} ${shirtColor} rounded-full z-12 origin-top transition-transform ${isRun && !isJump && !isUnderwater ? (runFrame === 0 ? '-rotate-45' : 'rotate-45') : 'rotate-0'} ${isJump || isUnderwater ? '-rotate-135' : ''}`} 
                     />
                     {/* Legs */}
                     {!isJump && !isUnderwater ? (
                         <>
                            <div className={`absolute bottom-0 left-2 w-2.5 ${isBig ? 'h-4' : 'h-3'} ${overallColor} rounded-b-sm transition-transform ${isRun ? (runFrame === 1 ? '-translate-x-1 -translate-y-1' : 'translate-x-0') : ''}`} />
                            <div className={`absolute bottom-0 right-2 w-2.5 ${isBig ? 'h-4' : 'h-3'} ${overallColor} rounded-b-sm transition-transform ${isRun ? (runFrame === 2 ? 'translate-x-1 -translate-y-1' : 'translate-x-0') : ''}`} />
                         </>
                     ) : (
                         <div className={`absolute bottom-1 left-3 w-4 ${isBig ? 'h-5' : 'h-4'} ${overallColor} rounded-full`} />
                     )}
                 </div>
            </div>
        );
    }
    
    if (entity.type === 'CHECKPOINT') {
         const isActive = entity.activated;
         return (
             <div className="absolute will-change-transform" style={baseStyle}>
                 {/* Pole */}
                 <div className="absolute bottom-0 left-1/2 w-1 h-full bg-white -ml-0.5 border-l border-gray-300" />
                 {/* Flag */}
                 <div 
                    className={`absolute top-1 left-1/2 w-6 h-4 transition-colors duration-500 ${isActive ? 'bg-red-600' : 'bg-gray-700'}`}
                    style={{ transformOrigin: 'left', transform: isActive ? 'rotate(0deg)' : 'rotate(30deg) scaleX(0.8)' }}
                 >
                     <Flag size={16} className={`text-white ${isActive ? 'fill-white' : 'opacity-50'}`} />
                 </div>
                 {/* Base */}
                 <div className="absolute bottom-0 left-1/4 w-1/2 h-2 bg-green-800 rounded-t-sm" />
             </div>
         );
    }

    if (entity.type === 'MUSHROOM') return <div className="absolute will-change-transform drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" style={baseStyle}><div className="relative w-full h-full"><div className="absolute top-0 left-0 w-full h-3/5 bg-red-600 rounded-t-full z-10"><div className="absolute top-1 left-2 w-3 h-3 bg-white rounded-full opacity-90" /><div className="absolute top-1 right-2 w-2 h-2 bg-white rounded-full opacity-90" /><div className="absolute bottom-1 left-1/2 w-4 h-2 bg-white rounded-full opacity-90 -ml-2" /></div><div className="absolute bottom-0 left-1/4 w-1/2 h-2/5 bg-orange-100 rounded-b-md border-x-2 border-b-2 border-orange-200 z-0"><div className="absolute top-1 left-1 w-1 h-2 bg-black opacity-50 rounded-full" /><div className="absolute top-1 right-1 w-1 h-2 bg-black opacity-50 rounded-full" /></div></div></div>;

    if (entity.type === 'FIRE_FLOWER') return <div className="absolute will-change-transform flex justify-center items-center drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" style={baseStyle}><div className="relative w-6 h-6 animate-pulse"><div className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white" /><div className="absolute top-1 left-1 w-4 h-4 bg-yellow-400 rounded-full" /><div className="absolute bottom-0 left-2 w-2 h-4 bg-green-500 -z-10" /><div className="absolute bottom-1 left-0 w-2 h-2 bg-green-500 rounded-full -z-10" /><div className="absolute bottom-1 right-0 w-2 h-2 bg-green-500 rounded-full -z-10" /></div></div>;

    if (entity.type === 'STAR') return <div className="absolute will-change-transform flex justify-center items-center drop-shadow-[0_0_10px_rgba(250,204,21,1)]" style={baseStyle}><div className="relative w-8 h-8 text-yellow-400 animate-spin-slow"><svg viewBox="0 0 24 24" fill="currentColor" stroke="black" strokeWidth="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg></div></div>;

    if (entity.type === 'FIREBALL') return <div className="absolute will-change-transform rounded-full bg-red-500 border-2 border-yellow-300 animate-spin shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={baseStyle} />;

    if (entity.type === 'PROJECTILE') return <div className="absolute will-change-transform rounded-full bg-purple-500 border-2 border-white animate-pulse" style={baseStyle} />;

    if (entity.type === 'GOOMBA') {
        const walkOffset = Math.sin(time / 2) * 2;
        return <div className="absolute will-change-transform" style={{...baseStyle, transform: isDying ? 'scaleY(0.2) translateY(30px)' : `translateX(0)`, opacity: isDying ? 0.8 : 1, transition: isDying ? 'transform 0.1s ease-out' : 'none'}}><div className="w-full h-full relative"><div className="w-full h-3/4 bg-amber-800 rounded-t-xl rounded-b-lg absolute top-0 z-10 shadow-inner flex justify-center items-center"><div className="flex gap-2"><div className="w-1 h-2 bg-black" /><div className="w-1 h-2 bg-black" /></div></div><div className="absolute bottom-0 left-0 w-4 h-3 bg-black rounded-full" style={{ transform: `translateX(${walkOffset}px)` }} /><div className="absolute bottom-0 right-0 w-4 h-3 bg-black rounded-full" style={{ transform: `translateX(${-walkOffset}px)` }} /></div></div>;
    }

    if (entity.type === 'BOO') {
        const isShy = entity.actionState === 1;
        const hover = Math.sin(time / 10) * 3;
        // Apply squish manually here to preserve the translation
        const transform = isDying 
            ? `scaleY(0.2) translateY(30px)` 
            : `translateY(${hover}px)`;

        return <div className={`absolute will-change-transform ${hurtFilter}`} style={{ ...baseStyle, transform, opacity: isDying ? 0.8 : 1, transition: isDying ? 'transform 0.1s ease-out' : 'none' }}><div className={`w-full h-full relative flex items-center justify-center ${isFacingLeft ? 'scale-x-[-1]' : ''}`}><div className="w-full h-full bg-white rounded-full shadow-lg opacity-90 relative"><div className="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full" />{isShy ? (<><div className="absolute top-1/4 left-1/4 w-3 h-3 bg-white border-2 border-gray-200 rounded-full z-20" /><div className="absolute top-1/4 right-1/4 w-3 h-3 bg-white border-2 border-gray-200 rounded-full z-20" /><div className="absolute top-1/3 left-1/3 w-1 h-1 bg-pink-300 rounded-full opacity-50" /><div className="absolute top-1/3 right-1/3 w-1 h-1 bg-pink-300 rounded-full opacity-50" /></>) : (<><div className="absolute top-1/3 left-2 w-2 h-3 bg-black rounded-full" /><div className="absolute top-1/3 right-4 w-2 h-3 bg-black rounded-full" /><div className="absolute bottom-2 left-1/3 w-4 h-3 bg-red-900 rounded-b-full flex justify-center"><div className="w-1 h-1 bg-white rounded-sm mt-0.5" /><div className="w-1 h-1 bg-white rounded-sm mt-0.5 ml-1" /></div><div className="absolute top-1/2 -left-2 w-3 h-3 bg-white rounded-full" /><div className="absolute top-1/2 -right-2 w-3 h-3 bg-white rounded-full" /></>)}</div></div></div>;
    }
    
    // Quick render for others to avoid truncation issues
    if (entity.type === 'BLOOPER') {
         const squeeze = Math.sin(time / 5) * 0.1;
         const transform = isDying
            ? 'scaleY(0.2) translateY(30px)'
            : `scale(${1 - squeeze}, ${1 + squeeze})`;

         return <div className={`absolute will-change-transform ${hurtFilter}`} style={{ ...baseStyle, transform, opacity: isDying ? 0.8 : 1, transition: isDying ? 'transform 0.1s ease-out' : 'none' }}><div className="w-full h-full relative"><div className="absolute top-0 left-1/4 w-1/2 h-2/3 bg-white rounded-t-full shadow-sm z-10 flex items-center justify-around px-1"><div className="w-2 h-2 bg-black rounded-full relative"><div className="w-1 h-1 bg-white rounded-full absolute top-0 left-0" /></div><div className="w-2 h-2 bg-black rounded-full relative"><div className="w-1 h-1 bg-white rounded-full absolute top-0 left-0" /></div></div><div className="absolute bottom-0 left-0 w-full h-1/2 flex justify-center gap-1"><div className="w-2 h-full bg-white rounded-b-full transform -rotate-12" /><div className="w-2 h-full bg-white rounded-b-full" /><div className="w-2 h-full bg-white rounded-b-full transform rotate-12" /></div></div></div>;
    }
    if (entity.type === 'CHEEP_CHEEP') {
         // Apply squish for Cheep Cheep
         const transform = isDying ? 'scaleY(0.2) translateY(30px)' : '';

         return <div className={`absolute will-change-transform ${hurtFilter}`} style={{ ...baseStyle, transform, opacity: isDying ? 0.8 : 1, transition: isDying ? 'transform 0.1s ease-out' : 'none' }}><div className={`w-full h-full relative bg-red-500 rounded-full shadow-sm flex items-center justify-center border border-red-600 ${isFacingLeft ? 'scale-x-[-1]' : ''}`}><div className="absolute top-1 left-2 w-3 h-3 bg-white rounded-full"><div className="w-1 h-1 bg-black rounded-full absolute top-1 right-0" /></div><div className="absolute bottom-2 left-1 w-3 h-2 bg-yellow-400 rounded-full transform rotate-45" /><div className="absolute right-0 w-4 h-4 bg-yellow-400 rounded-l-full opacity-80" /><div className="absolute top-0 right-1/3 w-4 h-2 bg-red-600 rounded-t-full" /></div></div>;
    }
     if (entity.type === 'SPINY') {
        const walkOffset = Math.sin(time / 2) * 2;
        // Spiny usually can't be stomped, but if it dies it might flip. For now, simple logic.
        return <div className="absolute will-change-transform" style={{...baseStyle}}><div className="w-full h-full relative"><div className="w-full h-3/4 bg-red-600 rounded-t-full absolute top-1 z-10 border-b-2 border-red-800 flex justify-center"><div className="absolute -top-1 w-2 h-2 bg-gray-200 rotate-45 border border-gray-400" /><div className="absolute -top-0 left-1 w-2 h-2 bg-gray-200 rotate-45 border border-gray-400" /><div className="absolute -top-0 right-1 w-2 h-2 bg-gray-200 rotate-45 border border-gray-400" /></div><div className={`absolute bottom-1 ${isFacingLeft ? 'left-0' : 'right-0'} w-4 h-4 bg-orange-300 rounded-full z-11 border border-orange-400`} /><div className="absolute bottom-0 left-1 w-3 h-2 bg-orange-400 rounded-full transition-transform" style={{ transform: `translateX(${walkOffset}px)` }} /><div className="absolute bottom-0 right-1 w-3 h-2 bg-orange-400 rounded-full transition-transform" style={{ transform: `translateX(${-walkOffset}px)` }} /></div></div>;
    }
     if (entity.type === 'SPINY_EGG') return <div className="absolute will-change-transform animate-spin" style={{...baseStyle, width: TILE_SIZE*0.8, height: TILE_SIZE*0.8, left: entity.pos.x + 4, top: entity.pos.y + 4}}><div className="w-full h-full bg-red-600 rounded-full border-2 border-red-800 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full opacity-50" /></div></div>;
     
     if (entity.type === 'LAKITU') {
        const hoverY = Math.sin(time / 15) * 5;
        // Apply squish for Lakitu
        const transform = isDying 
            ? 'scaleY(0.2) translateY(30px)' 
            : `translateY(${hoverY}px)`;

        return <div className="absolute will-change-transform z-20" style={{...baseStyle, transform, opacity: isDying ? 0.8 : 1, transition: isDying ? 'transform 0.1s ease-out' : 'none'}}><div className="absolute bottom-0 left-0 w-full h-2/3 bg-white rounded-full opacity-90 shadow-lg border-2 border-gray-200"><div className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full opacity-20" /><div className="absolute top-2 right-4 w-2 h-2 bg-black rounded-full opacity-20" /><div className="absolute bottom-2 left-1/3 w-1/3 h-1 bg-black opacity-20 rounded-full" /></div><div className="absolute -top-2 left-1/4 w-1/2 h-2/3 bg-yellow-400 rounded-t-lg border-2 border-green-600 z-0 flex justify-center"><div className="absolute top-2 w-full flex justify-center gap-1"><div className="w-3 h-3 bg-black rounded-full border-2 border-white" /><div className="w-3 h-3 bg-black rounded-full border-2 border-white" /></div></div></div>;
    }

    // Bosses
    if (entity.type.startsWith('BOSS_')) {
        const hpPercent = (entity.health || 0) / (entity.maxHealth || 1);
        if (entity.type === 'BOSS_GOOMBA') return <div className={`absolute will-change-transform ${hurtFilter}`} style={baseStyle}><div className="w-full h-full relative"><div className="absolute -top-6 left-1/4 w-1/2 h-6 bg-yellow-400 rounded-t-lg border-2 border-yellow-600 flex justify-around"><div className="w-2 h-2 bg-red-500 rounded-full mt-1" /><div className="w-2 h-2 bg-blue-500 rounded-full mt-1" /></div><div className="w-full h-3/4 bg-amber-800 rounded-t-[2rem] rounded-b-xl absolute top-0 z-10 shadow-xl flex flex-col justify-center items-center border-4 border-amber-900"><div className="flex gap-4 mb-2"><div className="w-6 h-8 bg-white rounded-full relative"><div className="w-3 h-3 bg-black rounded-full absolute top-2 right-1" /></div><div className="w-6 h-8 bg-white rounded-full relative"><div className="w-3 h-3 bg-black rounded-full absolute top-2 left-1" /></div></div><div className="w-16 h-4 bg-black rounded-full flex justify-center gap-2"><div className="w-2 h-2 bg-white rounded-sm mt-1" /><div className="w-2 h-2 bg-white rounded-sm mt-1" /></div></div><div className="absolute bottom-0 left-0 w-12 h-8 bg-black rounded-full" /><div className="absolute bottom-0 right-0 w-12 h-8 bg-black rounded-full" /><div className="absolute -top-10 left-0 w-full h-2 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{ width: `${hpPercent * 100}%` }} /></div></div></div>;
        if (entity.type === 'BOSS_MECHA') return <div className={`absolute will-change-transform ${hurtFilter}`} style={baseStyle}><div className="w-full h-full relative flex justify-center items-center"><Bot size={80} className="text-gray-400 drop-shadow-lg" /><div className="absolute w-full h-full border-4 border-gray-600 rounded-full opacity-50 animate-pulse" /><div className="absolute top-1/3 left-1/4 w-3 h-3 bg-red-500 rounded-full animate-ping" /><div className="absolute top-1/3 right-1/4 w-3 h-3 bg-red-500 rounded-full animate-ping" /><div className="absolute -top-8 left-0 w-full h-2 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${hpPercent * 100}%` }} /></div></div></div>;
        if (entity.type === 'BOSS_DEMON') return <div className={`absolute will-change-transform ${hurtFilter}`} style={baseStyle}><div className="w-full h-full relative flex justify-center items-center text-red-900"><Ghost size={90} className="fill-red-950 stroke-red-600" /><div className="absolute top-8 left-6 w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_10px_yellow]" /><div className="absolute top-8 right-6 w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_10px_yellow]" /><div className="absolute -top-8 left-0 w-full h-2 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${hpPercent * 100}%` }} /></div></div></div>;
    }

    return null;
};

// ... RenderParticle same as before ...
const RenderParticle: React.FC<{ p: Particle }> = ({ p }) => {
    const style: React.CSSProperties = {
        left: p.pos.x, 
        top: p.pos.y, 
        width: p.size.x, 
        height: p.size.y,
        opacity: p.life / p.maxLife,
        transform: p.rotation ? `rotate(${p.rotation}deg)` : 'none'
    };

    if (p.color === 'coin') {
         return (
            <div 
                className="absolute bg-yellow-400 rounded-full border-2 border-yellow-200 shadow-lg flex items-center justify-center font-bold text-yellow-800 text-xs"
                style={{ ...style, transform: 'scaleX(0.8)' }} 
            >
                <div className="w-2/3 h-2/3 border border-yellow-600 rounded-full opacity-50" />
            </div>
        );
    }
    return (
        <div 
            className={`absolute ${p.color} rounded-sm`}
            style={style}
        />
    );
};

// --- Main Game Component ---

export default function Game() {
    const [gameState, setGameState] = useState<GameState['status']>('START');
    const [levelIdx, setLevelIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [coins, setCoins] = useState(0);
    const [lives, setLives] = useState(3);
    const [timeLeft, setTimeLeft] = useState(300);
    const [damageFlash, setDamageFlash] = useState(false);

    const requestRef = useRef<number>();
    const marioRef = useRef<Entity>({
        id: 'mario', type: 'MARIO', pos: {x: 0, y: 0}, vel: {x: 0, y: 0}, size: {x: 30, y: 30}, grounded: false, facing: 1, health: 1, fireballAmmo: 0
    });
    const entitiesRef = useRef<Entity[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const tilesRef = useRef<TileType[][]>([]);
    const cameraXRef = useRef(0);
    const keysRef = useRef<InputState>({ left: false, right: false, up: false, down: false, run: false, fire: false });
    const globalTimeRef = useRef(0);
    const lastShotTimeRef = useRef(0);
    const spawnPointRef = useRef<Vector2>({x: 0, y: 0});
    const shakeRef = useRef(0);
    
    // UI State
    const [renderTrigger, setRenderTrigger] = useState(0);
    
    const triggerShake = useCallback((intensity: number) => {
        shakeRef.current = intensity;
    }, []);

    const loadLevel = useCallback((idx: number) => {
        const data = LEVELS[idx % LEVELS.length];
        const { tiles, entities, spawn } = parseMap(data.map);
        
        tilesRef.current = tiles;
        entitiesRef.current = entities;
        spawnPointRef.current = { ...spawn };
        marioRef.current = {
            id: 'mario',
            type: 'MARIO',
            pos: { ...spawn },
            vel: { x: 0, y: 0 },
            size: { x: 30, y: 30 }, 
            grounded: false,
            wasGrounded: false,
            facing: 1,
            health: 1,
            invulnerableTimer: 0,
            starTimer: 0,
            fireballAmmo: 50 // Start with ammo as requested (Work without fire flower)
        };
        particlesRef.current = [];
        cameraXRef.current = 0;
        shakeRef.current = 0;
        setTimeLeft(300);
        globalTimeRef.current = 0;
        setGameState('PLAYING');
    }, []);

    const update = useCallback(() => {
        // Loop logic
        if (gameState !== 'PLAYING') return;

        globalTimeRef.current++;
        const mario = marioRef.current;
        const input = keysRef.current;
        const isUnderwater = LEVELS[levelIdx % LEVELS.length].isUnderwater;
        
        // Shake
        if (shakeRef.current > 0) shakeRef.current -= 1;
        if (shakeRef.current < 0) shakeRef.current = 0;

        // Timers
        if (mario.invulnerableTimer && mario.invulnerableTimer > 0) mario.invulnerableTimer--;
        if (mario.starTimer && mario.starTimer > 0) mario.starTimer--;

        if (mario.dying) {
            // Dying logic...
            mario.dyingTimer = (mario.dyingTimer || 0) - 1;
            mario.pos.y += mario.vel.y;
            mario.vel.y += GRAVITY;
            if (mario.dyingTimer <= 0) {
                 if (lives > 1) {
                     setLives(l => l - 1);
                     mario.dead = false;
                     mario.dying = false;
                     mario.pos = { ...spawnPointRef.current };
                     mario.vel = { x: 0, y: 0 };
                     mario.health = 1;
                     mario.fireballAmmo = 50; // Reset ammo to default on respawn
                     mario.facing = 1;
                     cameraXRef.current = Math.max(0, mario.pos.x - window.innerWidth / 3);
                 } else {
                     setLives(0);
                     setGameState('GAME_OVER');
                 }
            }
            setRenderTrigger(prev => prev + 1);
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        // Mario Movement
        const currentAccel = isUnderwater ? WATER_ACCELERATION : (mario.grounded ? ACCELERATION : AIR_ACCELERATION);
        const currentFriction = isUnderwater ? WATER_FRICTION : (mario.grounded ? FRICTION : AIR_FRICTION);
        const currentGravity = isUnderwater ? UNDERWATER_GRAVITY : GRAVITY;
        const currentTermVel = isUnderwater ? TERMINAL_VELOCITY_WATER : TERMINAL_VELOCITY;

        if (input.left) {
            mario.vel.x -= currentAccel;
            mario.facing = -1;
        } else if (input.right) {
            mario.vel.x += currentAccel;
            mario.facing = 1;
        } else {
            mario.vel.x *= currentFriction; 
        }
        
        mario.vel.x = Math.max(Math.min(mario.vel.x, MOVE_SPEED), -MOVE_SPEED);
        if (Math.abs(mario.vel.x) < 0.1) mario.vel.x = 0;

        if (input.up) {
            if (isUnderwater) {
                 mario.vel.y += SWIM_FORCE * 0.2; // Increased maneuverability
                 if (mario.vel.y < SWIM_FORCE) mario.vel.y = SWIM_FORCE;
            } else if (mario.grounded) {
                mario.vel.y = JUMP_FORCE;
                mario.grounded = false;
                playJump();
            }
        }
        if (!isUnderwater && !input.up && mario.vel.y < -5) { 
            mario.vel.y *= 0.5;
        }

        mario.vel.y += currentGravity;
        if (mario.vel.y > currentTermVel) mario.vel.y = currentTermVel;

        // Hard clamp specifically for Underwater level top bound restriction
        // Although the map has ceiling blocks, this prevents glitching through them with high speed swimming
        if (isUnderwater && mario.pos.y < TILE_SIZE) {
            mario.pos.y = TILE_SIZE;
            if (mario.vel.y < 0) mario.vel.y = 0;
        }

        // Shooting with Ammo (Modified to work without fire flower)
        if (input.run || input.fire) {
            const now = globalTimeRef.current;
            if (now - lastShotTimeRef.current > 30) { 
                if ((mario.fireballAmmo || 0) > 0) {
                    lastShotTimeRef.current = now;
                    mario.fireballAmmo = (mario.fireballAmmo || 0) - 1;
                    playShoot();
                    
                    const startX = mario.pos.x + (mario.facing === 1 ? mario.size.x : -10);
                    const startY = mario.pos.y + 10;
                    
                    for(let i=0; i<4; i++) {
                        particlesRef.current.push({
                            id: `spark-${now}-${i}`, type: 'PARTICLE', pos: { x: startX, y: startY }, vel: { x: (Math.random() - 0.5) * 4 + mario.facing * 2, y: (Math.random() - 0.5) * 4 }, size: { x: 4, y: 4 }, life: 10, maxLife: 10, color: Math.random() > 0.5 ? 'bg-yellow-400' : 'bg-red-500', facing: 1
                        });
                    }

                    entitiesRef.current.push({
                        id: `fireball-${now}`, type: 'FIREBALL', pos: { x: startX, y: startY }, vel: { x: mario.facing * FIREBALL_SPEED, y: isUnderwater ? 0 : 2 }, size: { x: 12, y: 12 }, facing: mario.facing, grounded: false
                    });
                }
            }
        }

        // Map Collision & Entity Interactions
        resolveMapCollision(mario, tilesRef.current, (tx, ty) => {
            const isBig = (mario.health || 1) > 1;
            const result = handleBlockInteraction(tx, ty, tilesRef.current, isBig);
            if (result) {
                particlesRef.current.push(...result.particles);
                if (result.spawn) {
                    entitiesRef.current.push(result.spawn);
                    playPowerUpAppears();
                }
                if (result.broke) playBreak(); else playBump();
                if (result.particles.length > 0 && result.particles[0].color === 'coin') {
                    setCoins(c => c + 1);
                    setScore(s => s + 100);
                    playCoin();
                }
                entitiesRef.current.forEach(e => {
                     if (!e.dead && e.grounded) {
                         const eCenter = e.pos.x + e.size.x/2;
                         const blockCenter = tx * TILE_SIZE + TILE_SIZE/2;
                         const eBottom = e.pos.y + e.size.y;
                         const blockTop = ty * TILE_SIZE;
                         if (Math.abs(eCenter - blockCenter) < TILE_SIZE && Math.abs(eBottom - blockTop) < 5) {
                             if (e.type === 'GOOMBA' || e.type === 'SPINY' || e.type === 'LAKITU' || e.type === 'BOO') {
                                 e.dead = true;
                                 playStomp();
                                 setScore(s => s + 100);
                                  particlesRef.current.push({ id: `bump-kill-${e.id}`, type: 'PARTICLE', pos: { x: e.pos.x, y: e.pos.y }, vel: {x:0, y:-5}, size: e.size, life: 20, maxLife: 20, color: 'bg-white', facing: 1, rotation: 180 });
                             }
                         }
                     }
                });
            } else {
                playBump();
            }
        });

        // Dust
        if (!mario.wasGrounded && mario.grounded) {
             for(let i=0; i<3; i++) {
                 particlesRef.current.push({ id: `dust-${globalTimeRef.current}-${i}`, type: 'PARTICLE', pos: { x: mario.pos.x + mario.size.x/2 - 2, y: mario.pos.y + mario.size.y - 2 }, vel: { x: (Math.random() - 0.5) * 2, y: -0.5 - Math.random() }, size: { x: 4, y: 4 }, life: 15, maxLife: 15, color: 'bg-stone-300', facing: 1 });
             }
        }
        mario.wasGrounded = mario.grounded;

        // Underwater Bubbles
        if (isUnderwater && globalTimeRef.current % 40 === 0) {
            particlesRef.current.push({
                id: `bubble-${globalTimeRef.current}`,
                type: 'PARTICLE',
                pos: { x: mario.pos.x + (mario.facing === 1 ? mario.size.x : 0), y: mario.pos.y + 10 },
                vel: { x: (Math.random() - 0.5) * 1, y: -1 - Math.random() },
                size: { x: 4, y: 4 },
                life: 60,
                maxLife: 60,
                color: 'bg-white/40 border border-white/60 rounded-full',
                facing: 1
            });
        }

        // Entities
        const newSpawns: Entity[] = [];
        entitiesRef.current.forEach(e => {
            if (e.dead) return;
            if (e.dying) {
                if (e.dyingTimer !== undefined) {
                    e.dyingTimer--;
                    if (e.dyingTimer <= 0) e.dead = true;
                }
                return; 
            }
            if (e.invulnerableTimer && e.invulnerableTimer > 0) e.invulnerableTimer--;

            // Simple AI Logic call (embedded for brevity as it was already implemented)
            // ... (AI implementation from previous steps) ...
            
             // Specific Entity Update Logic (Condensed for this update, maintaining existing logic)
             if (e.type === 'GOOMBA') {
                 // ... existing goomba logic ...
                  e.timer = (e.timer || 0) + 1;
                  const distToMario = mario.pos.x - e.pos.x;
                  const distY = Math.abs(mario.pos.y - e.pos.y);
                  const isClose = Math.abs(distToMario) < 250 && distY < 120;
                  let targetSpeed = GOOMBA_SPEED;
                  if (isClose) { e.actionState = 1; e.facing = distToMario > 0 ? 1 : -1; targetSpeed = GOOMBA_SPEED * 1.5; if (e.grounded && Math.random() < 0.01) e.vel.y = -5; }
                  else { if (e.timer > 150 + Math.random() * 100) { const rand = Math.random(); if (rand < 0.3) e.actionState = 2; else if (rand < 0.6) { e.actionState = 0; e.facing *= -1; } else e.actionState = 0; e.timer = 0; } if (e.actionState === 2) targetSpeed = 0; }
                  if (e.grounded && targetSpeed > 0) { const lookAheadX = e.pos.x + (e.facing === 1 ? e.size.x + 5 : -5); const tileX = Math.floor(lookAheadX / TILE_SIZE); const tileY = Math.floor((e.pos.y + e.size.y + 2) / TILE_SIZE); if (tilesRef.current[tileY] && !isSolid(tilesRef.current[tileY][tileX])) { if (isClose) { e.vel.y = -4; e.vel.x = e.facing * (targetSpeed + 2); } else { e.facing *= -1; e.vel.x = e.facing * targetSpeed; } } }
                  e.vel.x = e.facing * targetSpeed; e.vel.y += GRAVITY; resolveMapCollision(e, tilesRef.current);
             } else if (e.type === 'BOO') {
                 // Boo AI
                 const dx = mario.pos.x - e.pos.x;
                 const dy = mario.pos.y - e.pos.y;
                 const isLookingAt = Math.sign(dx) !== 0 && Math.sign(dx) !== mario.facing;
                 if (isLookingAt) { e.actionState = 1; e.vel.x = 0; e.vel.y = 0; } 
                 else { e.actionState = 0; const dist = Math.sqrt(dx*dx + dy*dy); if (dist > 0) { e.vel.x = (dx/dist) * BOO_SPEED; e.vel.y = (dy/dist) * BOO_SPEED; } e.facing = dx > 0 ? 1 : -1; }
                 e.pos.x += e.vel.x; e.pos.y += e.vel.y;
             } else if (e.type === 'SPINY') {
                 // Spiny AI
                  e.vel.y += GRAVITY;
                  const distToMario = mario.pos.x - e.pos.x;
                  if (Math.abs(distToMario) < 300 && Math.abs(mario.pos.y - e.pos.y) < 150) { e.facing = distToMario > 0 ? 1 : -1; e.vel.x = e.facing * SPINY_SPEED * 1.5; }
                  else { e.timer = (e.timer || 0) + 1; if (e.timer > 100) { if (Math.random() < 0.5) e.facing *= -1; e.timer = 0; } e.vel.x = e.facing * SPINY_SPEED; }
                  resolveMapCollision(e, tilesRef.current);
             } else if (e.type === 'LAKITU') {
                 // Lakitu
                  const targetX = mario.pos.x; const dist = targetX - e.pos.x; e.vel.x = dist * 0.03; 
                  if (e.vel.x > 4) e.vel.x = 4; if (e.vel.x < -4) e.vel.x = -4; e.pos.x += e.vel.x;
                  if (e.timer !== undefined) { e.timer++; if (e.timer > 180) { e.timer = 0; const leadFrames = 30; const predictedMarioX = mario.pos.x + (mario.vel.x * leadFrames); const dx = predictedMarioX - e.pos.x; let throwVelX = dx * 0.05; if (throwVelX > 5) throwVelX = 5; if (throwVelX < -5) throwVelX = -5; newSpawns.push({ id: `spiny-egg-${globalTimeRef.current}`, type: 'SPINY_EGG', pos: { x: e.pos.x, y: e.pos.y + 20 }, vel: { x: throwVelX, y: -4 }, size: { x: TILE_SIZE, y: TILE_SIZE }, facing: 1, grounded: false }); } }
             } else if (e.type === 'CHEEP_CHEEP') { 
                  // Cheep Cheep - Natural swimming with wall collision
                  // 1. Oscillate vertically for swimming effect
                  e.vel.y = Math.cos(globalTimeRef.current / 15) * 1.5; 
                  
                  // 2. Set facing based on velocity (handled in render usually, but good to track)
                  if (Math.abs(e.vel.x) > 0.1) e.facing = e.vel.x > 0 ? 1 : -1;
                  
                  // 3. Resolve collision to bounce off walls (Physics util handles flipping vel.x)
                  resolveMapCollision(e, tilesRef.current);
                  
                  // 4. Despawn if far off screen
                  if (e.pos.x < cameraXRef.current - 200 || e.pos.y > window.innerHeight + 200) e.dead = true;

             } else if (e.type === 'BLOOPER') { 
                  // Blooper AI - Hunt & Bob
                  const dx = mario.pos.x - e.pos.x;
                  const dy = mario.pos.y - e.pos.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  
                  e.timer = (e.timer || 0) + 1;
                  const detectionRange = 300; // Attack range
                  
                  // State Machine via timer
                  // > 60: Decision time (Attack or Idle)
                  if (e.timer > 60) {
                      if (dist < detectionRange) {
                           // Lunge at Mario
                           const angle = Math.atan2(dy, dx);
                           e.vel.x = Math.cos(angle) * 5; // Fast lunge
                           e.vel.y = Math.sin(angle) * 5;
                           e.facing = dx > 0 ? 1 : -1;
                      } else {
                           // Idle bob
                           if (Math.random() < 0.05) {
                               e.vel.y = -2; // Swim up a bit
                               e.vel.x = (Math.random() - 0.5) * 2; // Drift
                           }
                      }
                      e.timer = 0; // Reset decision timer
                  }
                  
                  // Physics
                  e.vel.x *= 0.95; // High water friction
                  e.vel.y *= 0.95;
                  e.vel.y += 0.05; // Very light gravity (sink slowly)
                  
                  resolveMapCollision(e, tilesRef.current);

             } else if (e.type.startsWith('BOSS_') || e.type === 'PROJECTILE' || e.type === 'SPINY_EGG' || e.type === 'FIREBALL' || e.type === 'MUSHROOM' || e.type === 'STAR' || e.type === 'FIRE_FLOWER' || e.type === 'CHECKPOINT') {
                  
                  // Demon Boss Logic (Floating, Dashing, Shooting)
                  if (e.type === 'BOSS_DEMON') {
                      e.timer = (e.timer || 0) + 1;
                      const dx = mario.pos.x - e.pos.x;
                      const dy = mario.pos.y - e.pos.y;
                      const dist = Math.sqrt(dx * dx + dy * dy);

                      // Floating motion (idle)
                      if (e.actionState !== 1) {
                          e.vel.y = Math.sin(globalTimeRef.current / 20) * 1.5;
                          e.vel.x *= 0.95; // Friction
                          e.facing = dx > 0 ? 1 : -1;
                          
                           // Shoot Projectile
                           if (e.timer % 150 === 0) {
                                 newSpawns.push({
                                    id: `proj-${e.id}-${globalTimeRef.current}`,
                                    type: 'PROJECTILE',
                                    pos: { x: e.pos.x + e.size.x/2 - 8, y: e.pos.y + e.size.y/2 - 8 },
                                    vel: { x: (dx/dist)*5, y: (dy/dist)*5 },
                                    size: { x: 16, y: 16 },
                                    facing: 1,
                                    grounded: false,
                                    timer: 0
                                });
                            }
                      }

                      // Dash Attack Trigger
                      if (dist < 300 && e.timer > 120 && e.actionState !== 1) {
                          e.actionState = 1; // Dash state
                          e.timer = 0; 
                          // Dash towards player
                          const speed = 12;
                          const angle = Math.atan2(dy, dx);
                          e.vel.x = Math.cos(angle) * speed;
                          e.vel.y = Math.sin(angle) * speed;
                           // Visual cue
                          for(let i=0; i<5; i++) particlesRef.current.push({ id: `dash-${e.id}-${globalTimeRef.current}-${i}`, type: 'PARTICLE', pos: { ...e.pos }, vel: {x:(Math.random()-0.5)*5,y:(Math.random()-0.5)*5}, size: {x:5,y:5}, life: 20, maxLife: 20, color: 'bg-red-500', facing: 1 });
                      }

                      // End Dash
                      if (e.actionState === 1 && e.timer > 30) {
                          e.actionState = 0;
                          e.vel.x *= 0.1;
                          e.vel.y *= 0.1;
                          e.timer = 60; // Cooldown before next action
                      }
                      
                      e.pos.x += e.vel.x;
                      e.pos.y += e.vel.y;
                      
                       // Keep bounds
                      if(e.pos.y > 600) e.pos.y = 600;

                  } else if (e.type === 'BOSS_MECHA') {
                        // Mecha Boss Logic - Slow hover and shoot
                        e.timer = (e.timer || 0) + 1;
                        const dx = mario.pos.x - e.pos.x;
                        const dy = mario.pos.y - e.pos.y;
                        
                        // Hover vertically
                        e.vel.y = Math.sin(globalTimeRef.current / 40) * 1;
                        e.pos.y += e.vel.y;
                        
                        // Move horizontally slowly towards player
                        e.facing = dx > 0 ? 1 : -1;
                        if (Math.abs(dx) > 100) {
                            e.vel.x = e.facing * 0.5;
                        } else {
                            e.vel.x = 0;
                        }
                        e.pos.x += e.vel.x;
                        
                        // Shoot Torpedo
                        if (e.timer % 200 === 0) {
                            newSpawns.push({
                                id: `torpedo-${e.id}-${globalTimeRef.current}`,
                                type: 'PROJECTILE',
                                pos: { x: e.pos.x + e.size.x/2, y: e.pos.y + e.size.y/2 },
                                vel: { x: e.facing * 4, y: 0 },
                                size: { x: 16, y: 16 },
                                facing: e.facing,
                                grounded: false,
                                timer: 0
                            });
                        }
                        resolveMapCollision(e, tilesRef.current);
                        
                  } else if (e.type === 'PROJECTILE') {
                        // Projectile Logic with Homing
                        e.timer = (e.timer || 0) + 1;
                        if (e.timer > 300) e.dead = true; 

                        if (!mario.dead) {
                            const dx = mario.pos.x - e.pos.x;
                            const dy = mario.pos.y - e.pos.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist > 0) {
                                // Slight homing
                                e.vel.x += (dx / dist) * 0.2;
                                e.vel.y += (dy / dist) * 0.2;
                                
                                // Limit speed
                                const speed = Math.sqrt(e.vel.x * e.vel.x + e.vel.y * e.vel.y);
                                if (speed > 6) {
                                    e.vel.x = (e.vel.x / speed) * 6;
                                    e.vel.y = (e.vel.y / speed) * 6;
                                }
                            }
                        }
                        e.pos.x += e.vel.x;
                        e.pos.y += e.vel.y;
                        
                         // Trail
                        if (globalTimeRef.current % 5 === 0) {
                             particlesRef.current.push({ id: `trail-${e.id}-${globalTimeRef.current}`, type: 'PARTICLE', pos: { x: e.pos.x+4, y: e.pos.y+4 }, vel: {x:0,y:0}, size: {x:8,y:8}, life: 10, maxLife: 10, color: 'bg-purple-400', facing: 1 });
                        }

                  } else {
                      // Standard Physics for others (Goomba Boss, Fireball, Items, etc)
                      if (!e.type.startsWith('BOSS_MECHA')) e.vel.y += GRAVITY;
                      
                      if (e.type !== 'FIREBALL' && !e.type.startsWith('BOSS_')) resolveMapCollision(e, tilesRef.current);
                      else if (e.type === 'FIREBALL') { e.vel.y += GRAVITY; resolveMapCollision(e, tilesRef.current); if (e.pos.x < cameraXRef.current || e.pos.x > cameraXRef.current + window.innerWidth) e.dead = true; }
                      
                      // Boss Goomba updates...
                      if (e.type === 'BOSS_GOOMBA') { e.vel.y += GRAVITY; resolveMapCollision(e, tilesRef.current); e.timer = (e.timer || 0) + 1; if (e.grounded && e.timer > 40) { e.vel.y = -15; e.vel.x = (mario.pos.x - e.pos.x > 0 ? 1 : -1) * 3; e.timer = 0; } }
                  }
             }

            // Powerup Pickup Logic with Ammo
            if (checkRectCollision(mario, e)) {
                 if (e.dead || e.dying) return;
                 if (e.type === 'MUSHROOM') {
                     e.dead = true; setScore(s => s + 1000); playPowerUp();
                     if ((mario.health || 1) < 2) { mario.health = 2; mario.size = { x: 32, y: 48 }; mario.pos.y -= 20; }
                 } else if (e.type === 'FIRE_FLOWER') {
                     e.dead = true; setScore(s => s + 1000); playPowerUp();
                     mario.health = 3; mario.size = { x: 32, y: 48 }; mario.fireballAmmo = (mario.fireballAmmo || 0) + 20; // Add ammo
                 } else if (e.type === 'STAR') {
                     e.dead = true; setScore(s => s + 1000); playPowerUp(); mario.starTimer = 600;
                 } else if (e.type === 'CHECKPOINT') {
                     if (!e.activated) { e.activated = true; spawnPointRef.current = { x: e.pos.x, y: e.pos.y }; playPowerUpAppears(); }
                 } else if (['GOOMBA', 'SPINY', 'LAKITU', 'BOO', 'BLOOPER', 'CHEEP_CHEEP', 'SPINY_EGG', 'PROJECTILE'].includes(e.type) || e.type.startsWith('BOSS_')) {
                      // Combat logic...
                      if (mario.starTimer && mario.starTimer > 0) {
                          e.dead = true; setScore(s => s + 200); playStomp();
                      } else {
                           const hitFromTop = mario.vel.y > 0 && (mario.pos.y + mario.size.y - e.pos.y) < 30;
                           if (hitFromTop && e.type !== 'SPINY' && e.type !== 'BOO' && !e.type.startsWith('BOSS_') && e.type !== 'PROJECTILE' && e.type !== 'SPINY_EGG') {
                               e.dying = true; 
                               e.dyingTimer = 15; 
                               mario.vel.y = JUMP_FORCE / 2; 
                               setScore(s => s + 200); 
                               playStomp();
                               // Add squish particles
                               for (let i = 0; i < 5; i++) {
                                   particlesRef.current.push({
                                       id: `stomp-${e.id}-${i}`,
                                       type: 'PARTICLE',
                                       pos: { x: e.pos.x + e.size.x/2, y: e.pos.y },
                                       vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 1) * 3 },
                                       size: { x: 4, y: 4 },
                                       life: 15,
                                       maxLife: 15,
                                       color: 'bg-white',
                                       facing: 1
                                   });
                               }
                           } else if (!mario.invulnerableTimer) {
                               takeDamage(mario);
                           }
                      }
                 }
            }
            // Fireball collisions
            if (e.type === 'FIREBALL') {
                 entitiesRef.current.forEach(target => {
                     if (target.dead || target.dying || target.type === 'FIREBALL' || target.type === 'MARIO' || target.type === 'PARTICLE' || ['MUSHROOM','FIRE_FLOWER','STAR','CHECKPOINT'].includes(target.type) || target.type === 'PROJECTILE') return;
                     if (checkRectCollision(e, target)) {
                         e.dead = true;
                         if (target.type.startsWith('BOSS_')) {
                              target.health = (target.health || 0) - 0.5;
                              target.invulnerableTimer = 20;
                              playStomp();
                              if (target.health <= 0) killBoss(target);
                         } else {
                             target.dead = true;
                             setScore(s => s + 200);
                             playStomp();
                             particlesRef.current.push({ id: `hit-${target.id}`, type: 'PARTICLE', pos: { x: target.pos.x, y: target.pos.y }, vel: {x:0, y:-4}, size: {x:20, y:20}, life: 15, maxLife: 15, color: 'bg-white', facing: 1 });
                         }
                     }
                 });
            }
        });
        
        if (newSpawns.length > 0) entitiesRef.current.push(...newSpawns);

        // Win
        const tx = Math.floor((mario.pos.x + mario.size.x/2) / TILE_SIZE);
        const ty = Math.floor((mario.pos.y + mario.size.y/2) / TILE_SIZE);
        if (tilesRef.current[ty] && (tilesRef.current[ty][tx] === 'FLAG_POLE' || tilesRef.current[ty][tx] === 'FLAG_TOP')) {
            playLevelClear();
            setGameState('LEVEL_COMPLETE');
        }
        if (mario.pos.y > tilesRef.current.length * TILE_SIZE) killMario(mario);

        // Particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.life--; p.pos.x += p.vel.x; p.pos.y += p.vel.y; p.vel.y += GRAVITY; 
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

        // Camera
        const screenW = window.innerWidth;
        const targetCamX = mario.pos.x - screenW / 3;
        cameraXRef.current += (Math.max(0, targetCamX) - cameraXRef.current) * 0.1;
        if (cameraXRef.current < 0) cameraXRef.current = 0;

        entitiesRef.current = entitiesRef.current.filter(e => !e.dead);
        setRenderTrigger(prev => prev + 1);
        requestRef.current = requestAnimationFrame(update);

    }, [gameState, lives, triggerShake, levelIdx, loadLevel]); // Added loadLevel dependency

    const killBoss = (boss: Entity) => {
        boss.dead = true; setScore(s => s + 5000); triggerShake(20); playBreak();
        for(let i=0; i<20; i++) particlesRef.current.push({ id: `boss-death-${Math.random()}`, type: 'PARTICLE', pos: { x: boss.pos.x + boss.size.x/2, y: boss.pos.y + boss.size.y/2 }, vel: { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 }, size: { x: 20, y: 20 }, life: 60, maxLife: 60, color: 'bg-yellow-500', facing: 1 });
    };

    const killMario = (mario: Entity) => {
        if (!mario.dying) { playDamage(); mario.dying = true; mario.dyingTimer = 60; mario.vel.y = -10; }
    };

    const takeDamage = (mario: Entity) => {
        if ((mario.health || 1) > 1) {
             playDamage(); 
             triggerShake(20); 
             setDamageFlash(true);
             setTimeout(() => setDamageFlash(false), 200);
             if (mario.health === 3) { mario.health = 2; /* Removed ammo clearing to keep ammo on hit */ }
             else mario.health = 1;
             if (mario.health === 1) mario.size = { x: 30, y: 30 }; else mario.size = { x: 32, y: 48 };
             mario.invulnerableTimer = 120; mario.vel.y = -5;
        } else { killMario(mario); }
    };

    // Input
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.repeat) return;
            // Global pause toggle
            if (e.code === 'KeyP' || e.code === 'Escape') {
                 setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : (prev === 'PAUSED' ? 'PLAYING' : prev));
                 return;
            }
            switch(e.code) {
                case 'ArrowLeft': case 'KeyA': keysRef.current.left = true; break;
                case 'ArrowRight': case 'KeyD': keysRef.current.right = true; break;
                case 'ArrowUp': case 'Space': case 'KeyW': keysRef.current.up = true; break;
                case 'ArrowDown': case 'KeyS': keysRef.current.down = true; break;
                case 'ShiftLeft': case 'ShiftRight': case 'KeyX': case 'KeyK': keysRef.current.run = true; break;
                case 'KeyF': keysRef.current.fire = true; break;
            }
        };
        const up = (e: KeyboardEvent) => {
             switch(e.code) {
                case 'ArrowLeft': case 'KeyA': keysRef.current.left = false; break;
                case 'ArrowRight': case 'KeyD': keysRef.current.right = false; break;
                case 'ArrowUp': case 'Space': case 'KeyW': keysRef.current.up = false; break;
                case 'ArrowDown': case 'KeyS': keysRef.current.down = false; break;
                case 'ShiftLeft': case 'ShiftRight': case 'KeyX': case 'KeyK': keysRef.current.run = false; break;
                case 'KeyF': keysRef.current.fire = false; break;
            }
        };
        window.addEventListener('keydown', down); window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, []);

    useEffect(() => {
        if (gameState === 'PLAYING') requestRef.current = requestAnimationFrame(update);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [gameState, update]);

    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => { setTimeLeft(t => { if (t <= 0) { killMario(marioRef.current); return 0; } return t - 1; }); }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    // Rendering
    const camX = cameraXRef.current;
    const renderWidth = window.innerWidth;
    const startCol = Math.floor(camX / TILE_SIZE);
    const endCol = startCol + Math.ceil(renderWidth / TILE_SIZE) + 1;
    
    // Determine level theme (Simplified: just check if level index is 2 for CASTLE)
    // Could also be part of LevelData in types
    const currentLevelTheme = levelIdx === 2 ? 'CASTLE' : 'NORMAL';

    const visibleTiles = [];
    if (tilesRef.current.length > 0) {
        for (let y = 0; y < tilesRef.current.length; y++) {
            for (let x = startCol; x <= endCol; x++) {
                if (tilesRef.current[y] && tilesRef.current[y][x] && tilesRef.current[y][x] !== 'EMPTY') {
                    visibleTiles.push(<RenderTile key={`${x}-${y}`} type={tilesRef.current[y][x]} x={x} y={y} theme={currentLevelTheme} />);
                }
            }
        }
    }

    const handleTouchStart = (key: keyof InputState) => { keysRef.current[key] = true; };
    const handleTouchEnd = (key: keyof InputState) => { keysRef.current[key] = false; };
    const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
    const shakeY = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
    const isUnderwaterLevel = LEVELS[levelIdx] && LEVELS[levelIdx].isUnderwater;
    
    // --- HUD Components ---
    const HealthDisplay = () => {
         const hp = marioRef.current.health || 1;
         return (
             <div className="flex items-center gap-1 bg-black/40 p-1 px-3 rounded-full backdrop-blur-sm border border-white/20">
                 <Heart size={16} className={`fill-red-500 text-red-500`} />
                 <div className="flex gap-1 ml-1">
                     <div className={`w-3 h-3 rounded-full ${hp >= 1 ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-gray-700'}`} />
                     <div className={`w-3 h-3 rounded-full ${hp >= 2 ? 'bg-yellow-400 shadow-[0_0_5px_yellow]' : 'bg-gray-700'}`} />
                     <div className={`w-3 h-3 rounded-full ${hp >= 3 ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-gray-700'}`} />
                 </div>
             </div>
         );
    };

    const AmmoDisplay = () => {
        const ammo = marioRef.current.fireballAmmo || 0;
        if (ammo <= 0) return null;
        return (
            <div className="flex items-center gap-1 bg-black/40 p-1 px-3 rounded-full backdrop-blur-sm border border-white/20 animate-in slide-in-from-top duration-300">
                <Flame size={16} className="fill-orange-500 text-orange-500" />
                <span className="font-bold font-mono text-white text-sm">{ammo}</span>
            </div>
        );
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black select-none font-sans">
            <style>{` .animate-question { animation: question-pulse 1.5s ease-in-out infinite; } @keyframes question-pulse { 0%, 100% { transform: scale(1); background-color: #facc15; } 50% { transform: scale(1.02); background-color: #fde047; } } `}</style>

            {/* Start Screen */}
            {gameState === 'START' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-900 z-50 text-white p-4 text-center">
                    <h1 className="text-6xl font-extrabold text-yellow-400 drop-shadow-md mb-8 tracking-tighter">SUPER PLUMBER BROS</h1>
                    <button onClick={() => { initAudio(); loadLevel(0); setLives(3); }} className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-lg transform transition hover:scale-105 mb-4">
                        START GAME
                    </button>
                    <div className="text-sm opacity-60 max-w-md mx-auto bg-black/30 p-4 rounded-lg">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between border-b border-white/10 pb-1"><span>Move</span> <span className="font-mono text-yellow-200">Arrows / WASD</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1"><span>Jump</span> <span className="font-mono text-yellow-200">Space / W / Up</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1"><span>Run/Shoot</span> <span className="font-mono text-yellow-200">Shift / F / X</span></div>
                            <div className="flex justify-between"><span>Pause</span> <span className="font-mono text-yellow-200">P / Esc</span></div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Pause Menu */}
            {gameState === 'PAUSED' && (
                 <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                      <h2 className="text-4xl font-bold mb-8 flex items-center gap-3"><Pause size={40} /> PAUSED</h2>
                      <div className="flex flex-col gap-4 w-64">
                          <button onClick={() => setGameState('PLAYING')} className="bg-green-600 hover:bg-green-700 p-4 rounded-lg font-bold flex items-center justify-center gap-2"><Play size={20} /> RESUME</button>
                          <button onClick={() => { setGameState('PLAYING'); loadLevel(levelIdx); }} className="bg-yellow-600 hover:bg-yellow-700 p-4 rounded-lg font-bold flex items-center justify-center gap-2"><RotateCcw size={20} /> RESTART LEVEL</button>
                          <div className="bg-gray-800 p-4 rounded-lg">
                              <p className="text-center text-gray-400 mb-2 text-sm uppercase font-bold">Level Select</p>
                              <div className="flex justify-between gap-2">
                                  {LEVELS.map((_, i) => (
                                      <button key={i} onClick={() => { setLevelIdx(i); loadLevel(i); }} className={`flex-1 py-2 rounded ${levelIdx === i ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{i+1}</button>
                                  ))}
                              </div>
                          </div>
                          <button onClick={() => { setGameState('START'); }} className="bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold flex items-center justify-center gap-2"><Menu size={20} /> QUIT TO TITLE</button>
                      </div>
                 </div>
            )}

            {/* Other States (Game Over, Level Complete, Win) - same as before but ensure they sit above game world */}
            {(gameState === 'GAME_OVER' || gameState === 'LEVEL_COMPLETE' || gameState === 'WIN') && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
                     {gameState === 'GAME_OVER' && <><Skull size={64} className="text-red-500 mb-4" /><h2 className="text-5xl font-bold mb-4">GAME OVER</h2><p className="mb-8 text-gray-400">Score: {score}</p><button onClick={() => { initAudio(); loadLevel(levelIdx); setLives(3); }} className="flex items-center gap-2 bg-white text-black py-3 px-8 rounded-full font-bold hover:bg-gray-200"><RotateCcw size={20} /> TRY AGAIN</button></>}
                     {gameState === 'LEVEL_COMPLETE' && <><Trophy size={64} className="text-yellow-400 mb-4" /><h2 className="text-5xl font-bold mb-4">LEVEL CLEAR!</h2><button onClick={() => { const next = levelIdx + 1; if (next < LEVELS.length) { setLevelIdx(next); loadLevel(next); } else { playWin(); setGameState('WIN'); } }} className="flex items-center gap-2 bg-yellow-400 text-yellow-900 py-3 px-8 rounded-full font-bold hover:bg-yellow-300 shadow-xl">{levelIdx + 1 < LEVELS.length ? "NEXT LEVEL" : "FINISH GAME"} <ArrowRight size={20} /></button></>}
                     {gameState === 'WIN' && <><h1 className="text-6xl font-bold mb-4 text-yellow-300 animate-pulse">YOU WIN!</h1><button onClick={() => window.location.reload()} className="bg-white text-sky-600 py-3 px-8 rounded-full font-bold">PLAY AGAIN</button></>}
                </div>
            )}

            {/* Game World */}
            <div className="relative w-full h-full bg-black" style={{ transform: `translate(${shakeX}px, ${shakeY}px)` }}>
                {/* Damage Flash */}
                <div className={`absolute inset-0 z-50 bg-red-600/30 pointer-events-none transition-opacity duration-200 ${damageFlash ? 'opacity-100' : 'opacity-0'}`} />

                <ParallaxBackground level={levelIdx} cameraX={camX} isUnderwater={isUnderwaterLevel} />
                
                {/* HUD - Redesigned */}
                <div className="absolute top-0 left-0 w-full p-2 sm:p-4 z-40 pointer-events-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    {/* Left Group */}
                    <div className="flex gap-4 items-center">
                         <div className="flex flex-col">
                             <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Score</span>
                             <span className="text-xl font-mono font-bold text-white leading-none drop-shadow-md">{score.toString().padStart(6, '0')}</span>
                         </div>
                         <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-md border border-white/10">
                             <Coins size={14} className="text-yellow-400" />
                             <span className="font-mono font-bold text-lg">{coins.toString().padStart(2, '0')}</span>
                         </div>
                    </div>

                    {/* Center Group (Level/Time) */}
                    <div className="flex gap-6 items-center bg-black/20 px-4 py-1 rounded-full backdrop-blur-[2px]">
                         <div className="flex flex-col items-center">
                             <span className="text-[10px] text-white/70 font-bold uppercase">World</span>
                             <span className="font-mono font-bold">1-{levelIdx + 1}</span>
                         </div>
                         <div className="w-px h-6 bg-white/20" />
                         <div className="flex flex-col items-center">
                             <span className="text-[10px] text-white/70 font-bold uppercase">Time</span>
                             <span className={`font-mono font-bold ${timeLeft < 50 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{timeLeft}</span>
                         </div>
                    </div>

                    {/* Right Group (Status) */}
                    <div className="flex gap-3 items-center">
                        <HealthDisplay />
                        <AmmoDisplay />
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/20">
                            <User size={16} className="text-white" />
                             <span className="font-mono font-bold text-lg">x{lives}</span>
                        </div>
                        <button 
                            onClick={() => setGameState('PAUSED')} 
                            className="pointer-events-auto bg-white/20 hover:bg-white/40 p-2 rounded-full backdrop-blur-sm transition-colors"
                        >
                            <Pause size={20} className="fill-white" />
                        </button>
                    </div>
                </div>

                <div className="absolute top-0 left-0 h-full will-change-transform z-10" style={{ transform: `translate3d(-${camX}px, 0, 0)` }}>
                    {visibleTiles}
                    {entitiesRef.current.map(e => <RenderEntity key={e.id} entity={e} time={globalTimeRef.current} isUnderwater={isUnderwaterLevel} />)}
                    {particlesRef.current.map(p => <RenderParticle key={p.id} p={p} />)}
                    {marioRef.current && <RenderEntity entity={marioRef.current} time={globalTimeRef.current} isUnderwater={isUnderwaterLevel} />}
                </div>
            </div>

            {/* Mobile Controls */}
            <div className="absolute bottom-6 left-6 z-50 flex gap-4 md:hidden">
                <button className="w-16 h-16 bg-white/10 rounded-full border-2 border-white/30 backdrop-blur-sm active:bg-white/30 flex items-center justify-center touch-none" onTouchStart={(e) => { e.preventDefault(); handleTouchStart('left'); }} onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('left'); }}><ArrowRight className="rotate-180 text-white" size={32} /></button>
                <button className="w-16 h-16 bg-white/10 rounded-full border-2 border-white/30 backdrop-blur-sm active:bg-white/30 flex items-center justify-center touch-none" onTouchStart={(e) => { e.preventDefault(); handleTouchStart('right'); }} onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('right'); }}><ArrowRight className="text-white" size={32} /></button>
            </div>
            <div className="absolute bottom-6 right-6 z-50 flex gap-4 md:hidden">
                 <button className="w-20 h-20 bg-orange-500/40 rounded-full border-2 border-orange-300/50 backdrop-blur-sm active:bg-orange-500/60 flex items-center justify-center touch-none mr-2" onTouchStart={(e) => { e.preventDefault(); handleTouchStart('run'); }} onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('run'); }}><Flame size={32} className="text-white" /></button>
                <button className="w-20 h-20 bg-green-500/40 rounded-full border-2 border-green-300/50 backdrop-blur-sm active:bg-green-500/60 flex items-center justify-center touch-none" onTouchStart={(e) => { e.preventDefault(); handleTouchStart('up'); }} onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('up'); }}><ArrowRight className="-rotate-90 text-white" size={32} /></button>
            </div>
        </div>
    );
}