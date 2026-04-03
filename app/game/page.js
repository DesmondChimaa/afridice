'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

// ── CONSTANTS ──────────────────────────────────────────────
const TRACK=[[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14]];
const HOME_ENT={P1:[[13,7],[12,7],[11,7],[10,7],[9,7]],P2:[[1,7],[2,7],[3,7],[4,7],[5,7]],P3:[[7,13],[7,12],[7,11],[7,10],[7,9]],P4:[[7,1],[7,2],[7,3],[7,4],[7,5]]};
const HOME_FINAL={P1:[8,7],P2:[6,7],P3:[7,8],P4:[7,6]};
const BASE_COORDS={
  P1:[[10.5,10.5],[13,10.5],[10.5,13],[13,13]],
  P2:[[1.5,1.5],[4,1.5],[1.5,4],[4,4]],
  P3:[[1.5,10.5],[4,10.5],[1.5,13],[4,13]],
  P4:[[10.5,1.5],[13,1.5],[10.5,4],[13,4]]
};
const START_IDX={P1:39,P2:13,P3:0,P4:26};
const TURN_IDX={P1:37,P2:11,P3:50,P4:24};
const PLAYER1=['P3','P4'];
const PLAYER2=['P1','P2'];
const COLORS={P1:'#3498db',P2:'#2ecc71',P3:'#e74c3c',P4:'#f1c40f'};
const TOKEN_NAMES={P1:'Blue',P2:'Green',P3:'Red',P4:'Yellow'};
const TURN_ORDER=['P4','P2','P3','P1'];
const TIMER_TOTAL=70;

function getNextPos(p,pos){
  if(pos===-1)return START_IDX[p];
  if(pos===TURN_IDX[p])return 200;
  if(pos>=200&&pos<204)return pos+1;
  if(pos===204)return 299;
  if(pos===51)return 0;
  return pos+1;
}
function getXY(p,pos){
  if(pos===-1)return BASE_COORDS[p][0];
  if(pos>=200&&pos<=204)return HOME_ENT[p][pos-200];
  if(pos===299)return HOME_FINAL[p];
  return TRACK[pos];
}
function toPct(x,y,isBase){
  if(isBase)return{lx:(x/15*100)+'%',ly:(y/15*100)+'%'};
  return{lx:((x+0.5)/15*100)+'%',ly:((y+0.5)/15*100)+'%'};
}

const DOT_MAP={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function DieFace({value,rolling}){
  return(
    <div className={`w-11 h-11 bg-gradient-to-br from-red-500 to-red-800 rounded-lg grid grid-cols-3 grid-rows-3 p-1.5 gap-0.5 shadow-lg ${rolling?'animate-bounce':''}`}>
      {[0,1,2,3,4,5,6,7,8].map(i=>(
        <div key={i} className={`rounded-full ${DOT_MAP[value]?.includes(i)?'bg-white':'bg-transparent'}`}/>
      ))}
    </div>
  );
}

function GameBoard(){
  const router=useRouter();
  const boardRef=useRef(null);
  const canvasRef=useRef(null);

  // Game state
  const [positions,setPositions]=useState({P1:[-1,-1,-1,-1],P2:[-1,-1,-1,-1],P3:[-1,-1,-1,-1],P4:[-1,-1,-1,-1]});
  const [diceLeft,setDiceLeft]=useState([]);
  const [activeDie,setActiveDie]=useState(null);
  const [activeIsCombined,setActiveIsCombined]=useState(false);
  const [gamePhase,setGamePhase]=useState('IDLE');
  const [isAnimating,setIsAnimating]=useState(false);
  const [currentTurnIdx,setCurrentTurnIdx]=useState(0);
  const [pendingRollAgain,setPendingRollAgain]=useState(false);
  const [pillVal1,setPillVal1]=useState(1);
  const [pillVal2,setPillVal2]=useState(2);
  const [pillValC,setPillValC]=useState(3);
  const [score1,setScore1]=useState(0);
  const [score2,setScore2]=useState(0);
  const [diceValues,setDiceValues]=useState([1,1]);
  const [resultText,setResultText]=useState('–, –');
  const [turnText,setTurnText]=useState("Player 1's Turn — Yellow token");
  const [isP1Turn,setIsP1Turn]=useState(true);
  const [highlighted,setHighlighted]=useState([]);
  const [timerSeconds,setTimerSeconds]=useState(TIMER_TOTAL);
  const [showWarning,setShowWarning]=useState(false);
  const [winner,setWinner]=useState(null);
  const [originalDice,setOriginalDice]=useState([1,1]);
  const [rolling,setRolling]=useState(false);
  const [stackPicker,setStackPicker]=useState(null);

  // Refs for use inside async/interval
  const posRef=useRef(positions);
  const diceLeftRef=useRef([]);
  const phaseRef=useRef('IDLE');
  const animRef=useRef(false);
  const turnIdxRef=useRef(0);
  const origDiceRef=useRef([1,1]);
  const pendingRef=useRef(false);
  const timerRef=useRef(null);
  const warningShownRef=useRef(false);
  const gameOverRef=useRef(false);

  useEffect(()=>{posRef.current=positions;},[positions]);
  useEffect(()=>{diceLeftRef.current=diceLeft;},[diceLeft]);
  useEffect(()=>{phaseRef.current=gamePhase;},[gamePhase]);
  useEffect(()=>{animRef.current=isAnimating;},[isAnimating]);
  useEffect(()=>{turnIdxRef.current=currentTurnIdx;},[currentTurnIdx]);
  useEffect(()=>{origDiceRef.current=originalDice;},[originalDice]);
  useEffect(()=>{pendingRef.current=pendingRollAgain;},[pendingRollAgain]);

  function curTeam(idx){return PLAYER1.includes(TURN_ORDER[idx])?PLAYER1:PLAYER2;}
  function isP1Turn_(idx){return PLAYER1.includes(TURN_ORDER[idx]);}

  // ── TIMER: starts fresh on each turn, runs the WHOLE turn ──
  // Timer only resets when nextTurn() is called
  // It does NOT stop when rolling or selecting
  function startTimer(){
    if(timerRef.current)clearInterval(timerRef.current);
    setTimerSeconds(TIMER_TOTAL);
    setShowWarning(false);
    warningShownRef.current=false;
    timerRef.current=setInterval(()=>{
      setTimerSeconds(t=>{
        const next=t-1;
        if(next===10&&!warningShownRef.current){
          warningShownRef.current=true;
          setShowWarning(true);
        }
        if(next<=0){
          clearInterval(timerRef.current);
          // Guard: only fire once
          if(gameOverRef.current)return 0;
          gameOverRef.current=true;
          // Current player timed out — opponent wins
          const losing=isP1Turn_(turnIdxRef.current);
          const w=losing?'Player 2':'Player 1';
          if(losing)setScore2(s=>s+1);else setScore1(s=>s+1);
          setWinner({name:w,reason:'timeout'});
          setGamePhase('GAMEOVER');
          return 0;
        }
        return next;
      });
    },1000);
  }

  function stopTimer(){
    if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
  }

  // Track which human player owns the current timer
  const timerOwnerRef=useRef(null); // 'P1' or 'P2'

  // Start timer when turn changes
  useEffect(()=>{
    if(winner||gameOverRef.current)return;
    // Only start a fresh timer when human player CHANGES
    // P1 owns turns for P3(idx2) and P4(idx0)
    // P2 owns turns for P1(idx3) and P2(idx1)
    const humanOwner=isP1Turn_(currentTurnIdx)?'P1':'P2';
    if(timerOwnerRef.current!==humanOwner){
      timerOwnerRef.current=humanOwner;
      startTimer();
    }
    return()=>{};
  // eslint-disable-next-line
  },[currentTurnIdx,winner]);

  // Draw board on canvas
  useEffect(()=>{
    const canvas=canvasRef.current;
    const board=boardRef.current;
    if(!canvas||!board)return;
    const S=board.offsetWidth;
    if(S===0)return;
    canvas.width=S;canvas.height=S;
    const C=S/15;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f5f0e8';ctx.fillRect(0,0,S,S);
    // Corner bases
    [{c:0,r:0,fill:'#2ecc71'},{c:9,r:0,fill:'#f1c40f'},{c:0,r:9,fill:'#e74c3c'},{c:9,r:9,fill:'#3498db'}].forEach(({c,r,fill})=>{
      ctx.fillStyle=fill;ctx.fillRect(c*C,r*C,6*C,6*C);
    });
    // Base circles
    const bc={P2:[[1.5,1.5],[4,1.5],[1.5,4],[4,4]],P4:[[10.5,1.5],[13,1.5],[10.5,4],[13,4]],P3:[[1.5,10.5],[4,10.5],[1.5,13],[4,13]],P1:[[10.5,10.5],[13,10.5],[10.5,13],[13,13]]};
    const bcolors={P1:'#3498db',P2:'#2ecc71',P3:'#e74c3c',P4:'#f1c40f'};
    Object.entries(bc).forEach(([p,circles])=>{
      circles.forEach(([cx,cy])=>{
        ctx.beginPath();ctx.arc(cx*C,cy*C,C*0.55,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fill();
        ctx.strokeStyle=bcolors[p];ctx.lineWidth=2.5;ctx.stroke();
      });
    });
    // White track
    ctx.fillStyle='white';
    ctx.fillRect(6*C,0,3*C,15*C);ctx.fillRect(0,6*C,15*C,3*C);
    // Home lanes
    [{fill:'#f1c40f',sq:[[7,1],[7,2],[7,3],[7,4],[7,5]]},
     {fill:'#e74c3c',sq:[[7,9],[7,10],[7,11],[7,12],[7,13]]},
     {fill:'#3498db',sq:[[9,7],[10,7],[11,7],[12,7],[13,7]]},
     {fill:'#2ecc71',sq:[[1,7],[2,7],[3,7],[4,7],[5,7]]}
    ].forEach(({fill,sq})=>{ctx.fillStyle=fill;sq.forEach(([c,r])=>ctx.fillRect(c*C,r*C,C,C));});
    // Centre
    const cx2=7.5*C,cy2=7.5*C;
    ctx.beginPath();ctx.arc(cx2,cy2,C*1.2,0,Math.PI*2);ctx.fillStyle='#f0ede8';ctx.fill();
    ctx.beginPath();ctx.arc(cx2,cy2,C*0.5,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
    // Grid lines
    ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=0.6;
    for(let r=0;r<15;r++)for(let c=6;c<9;c++)ctx.strokeRect(c*C,r*C,C,C);
    for(let r=6;r<9;r++)for(let c=0;c<15;c++)ctx.strokeRect(c*C,r*C,C,C);
    ctx.strokeStyle='#888';ctx.lineWidth=2;ctx.strokeRect(1,1,S-2,S-2);
  },[]);

  // ── MOVE HELPERS ──────────────────────────────────────────
  function stepsToHome(p,pos){
    // Calculate exact steps from current position to home (299)
    // = steps to TURN_IDX + 6 home lane steps (200->204->299 = 6 steps)
    if(pos>=200)return(204-pos)+1; // already in home lane
    const turn=TURN_IDX[p];
    // Steps from pos to turn on main track (wrapping at 52)
    const stepsToTurn=pos<=turn?(turn-pos):(52-pos+turn);
    return stepsToTurn+6; // +6 for home lane
  }

  function canMove(p,i,val,isCombined){
    const pos=posRef.current[p][i];
    if(pos===299)return false;
    if(pos===-1)return val===6&&!isCombined&&diceLeftRef.current.includes(6);
    // In home lane — must not overshoot
    if(pos>=200)return val<=(204-pos)+1;
    // On main track — check if val would overshoot home
    const steps=stepsToHome(p,pos);
    if(val>steps)return false; // would overshoot — not allowed
    return true;
  }
  function getEligible(team,val,isCombined){
    const r=[];
    team.forEach(p=>{for(let i=0;i<4;i++){if(canMove(p,i,val,isCombined))r.push({p,i});}});
    return r;
  }
  function hasAnyMove(team,d1,d2){
    const saved=[...diceLeftRef.current];
    diceLeftRef.current=[d1,d2];
    const res=getEligible(team,d1,false).length>0||getEligible(team,d2,false).length>0||getEligible(team,d1+d2,true).length>0;
    diceLeftRef.current=saved;
    return res;
  }

  function updateLabel(idx,msg){
    const p=TURN_ORDER[idx];
    const pNum=isP1Turn_(idx)?'1':'2';
    setIsP1Turn(isP1Turn_(idx));
    setTurnText(msg||`Player ${pNum}'s Turn — ${TOKEN_NAMES[p]} token`);
  }

  // ── ROLL (timer keeps running!) ────────────────────────────
  async function handleRoll(){
    if(phaseRef.current!=='IDLE'||animRef.current||winner)return;
    // NOTE: NO stopTimer() here — timer keeps counting through the whole turn
    setIsAnimating(true);setHighlighted([]);
    setRolling(true);
    await new Promise(r=>setTimeout(r,600));
    const d1=Math.floor(Math.random()*6)+1;
    const d2=Math.floor(Math.random()*6)+1;
    setDiceValues([d1,d2]);
    setResultText(`${d1}, ${d2}  (${d1+d2})`);
    setRolling(false);
    setOriginalDice([d1,d2]);
    origDiceRef.current=[d1,d2];
    if(d1===6&&d2===6){setPendingRollAgain(true);pendingRef.current=true;}
    else{setPendingRollAgain(false);pendingRef.current=false;}
    const dl=[d1,d2];
    diceLeftRef.current=dl;setDiceLeft(dl);
    setIsAnimating(false);
    const team=curTeam(turnIdxRef.current);
    if(!hasAnyMove(team,d1,d2)){
      updateLabel(turnIdxRef.current,'No valid move — passing turn');
      await new Promise(r=>setTimeout(r,1200));
      nextTurn(turnIdxRef.current);
      return;
    }
    setGamePhase('SELECT_DIE');phaseRef.current='SELECT_DIE';
    setPillVal1(d1);setPillVal2(d2);setPillValC(d1+d2);
    updateLabel(turnIdxRef.current);
  }

  function selectDie(val,isCombined){
    setActiveDie(val);setActiveIsCombined(isCombined);
    const team=curTeam(turnIdxRef.current);
    const elig=getEligible(team,val,isCombined);
    if(elig.length>0){
      setHighlighted(elig.map(e=>`${e.p}-${e.i}`));
      setGamePhase('SELECT_PIECE');phaseRef.current='SELECT_PIECE';
      updateLabel(turnIdxRef.current,`Click a glowing token — ${val} step${val>1?'s':''}`);
    } else {
      setActiveDie(null);setActiveIsCombined(false);
      updateLabel(turnIdxRef.current,`No token can use ${val} — pick another`);
    }
  }

  async function movePieceAnim(p,idx,steps,startPos){
    return new Promise(resolve=>{
      let rem=steps,pos=startPos;
      const iv=setInterval(()=>{
        const nxt=getNextPos(p,pos);
        pos=nxt;
        setPositions(prev=>{
          const n={...prev,[p]:[...prev[p]]};
          n[p][idx]=nxt;posRef.current=n;return n;
        });
        rem--;
        // FIX: check win instantly the moment token reaches home
        if(nxt===299){
          clearInterval(iv);
          // Small delay for visual then check win
          setTimeout(()=>{
            checkWin(posRef.current);
          },100);
          resolve(pos);
          return;
        }
        if(rem===0){clearInterval(iv);resolve(pos);}
      },200);
    });
  }

  function doCapture(moverP,moverI,landPos,cameFromBase,curPos){
    if(landPos>=200||landPos===299||landPos===-1)return curPos;
    const moverIsP1=PLAYER1.includes(moverP);
    const moverTeam=moverIsP1?PLAYER1:PLAYER2;
    if(cameFromBase){
      const wasDouble6=(origDiceRef.current[0]===6&&origDiceRef.current[1]===6);
      const hasOther=moverTeam.some(p=>curPos[p].some((pos,i)=>{
        if(p===moverP&&i===moverI)return false;
        return pos!==-1&&pos!==299;
      }));
      if(!hasOther&&!wasDouble6)return curPos;
    }
    const oppHere=[];
    ['P1','P2','P3','P4'].forEach(opp=>{
      if(opp===moverP||PLAYER1.includes(opp)===moverIsP1)return;
      for(let oi=0;oi<4;oi++){if(curPos[opp][oi]===landPos)oppHere.push({p:opp,i:oi});}
    });
    if(oppHere.length===0)return curPos;
    const{p:oppP,i:oppI}=oppHere[0];
    const newPos={...curPos,[oppP]:[...curPos[oppP]],[moverP]:[...curPos[moverP]]};
    newPos[oppP][oppI]=-1;
    newPos[moverP][moverI]=299;
    return newPos;
  }

  async function applyMove(p,idx,val,isCombined){
    const pos=posRef.current[p][idx];
    const cameFromBase=(pos===-1);
    let landPos;
    if(pos===-1){
      const sp=START_IDX[p];
      setPositions(prev=>{const n={...prev,[p]:[...prev[p]]};n[p][idx]=sp;posRef.current=n;return n;});
      const dl=[...diceLeftRef.current];
      const si=dl.indexOf(6);if(si!==-1)dl.splice(si,1);
      diceLeftRef.current=dl;setDiceLeft(dl);
      landPos=sp;
    } else {
      landPos=await movePieceAnim(p,idx,val,pos);
      if(isCombined){diceLeftRef.current=[];setDiceLeft([]);}
      else{const dl=[...diceLeftRef.current];const ui=dl.indexOf(val);if(ui!==-1)dl.splice(ui,1);diceLeftRef.current=dl;setDiceLeft(dl);}
    }
    const captured=doCapture(p,idx,landPos,cameFromBase,posRef.current);
    if(captured!==posRef.current){setPositions(captured);posRef.current=captured;}
  }

  function checkWin(pos){
    const p1Won=PLAYER1.every(p=>pos[p].every(v=>v===299));
    const p2Won=PLAYER2.every(p=>pos[p].every(v=>v===299));
    if(p1Won){if(gameOverRef.current)return true;gameOverRef.current=true;stopTimer();setScore1(s=>s+1);setWinner({name:'Player 1',reason:'win'});setGamePhase('GAMEOVER');return true;}
    if(p2Won){if(gameOverRef.current)return true;gameOverRef.current=true;stopTimer();setScore2(s=>s+1);setWinner({name:'Player 2',reason:'win'});setGamePhase('GAMEOVER');return true;}
    return false;
  }

  // ── NEXT TURN: this is where timer resets ─────────────────
  function nextTurn(curIdx){
    setHighlighted([]);
    diceLeftRef.current=[];setDiceLeft([]);
    setActiveDie(null);setActiveIsCombined(false);
    setPendingRollAgain(false);pendingRef.current=false;
    const next=(curIdx+1)%TURN_ORDER.length;
    setCurrentTurnIdx(next);turnIdxRef.current=next;
    setGamePhase('IDLE');phaseRef.current='IDLE';
    updateLabel(next);
    // Timer resets automatically via useEffect watching currentTurnIdx
  }

  async function doMove(p,idx){
    setIsAnimating(true);animRef.current=true;
    setHighlighted([]);setGamePhase('MOVING');phaseRef.current='MOVING';
    await applyMove(p,idx,activeDie,activeIsCombined);
    setActiveDie(null);setActiveIsCombined(false);
    setIsAnimating(false);animRef.current=false;
    // Win may have already been declared inside movePieceAnim
    if(gameOverRef.current)return;
    if(checkWin(posRef.current))return;
    const dl=diceLeftRef.current;
    if(dl.length>0){
      const rv=dl[0];
      const elig=getEligible(curTeam(turnIdxRef.current),rv,false);
      if(elig.length>0){
        // Still have a usable die — show pill
        setGamePhase('SELECT_DIE');phaseRef.current='SELECT_DIE';
        setPillVal1(rv);
        updateLabel(turnIdxRef.current,`Use your remaining die (${rv})`);
        return;
      } else {
        // Remaining die exists but no token can use it — clear it
        diceLeftRef.current=[];setDiceLeft([]);
      }
    }
    if(pendingRef.current){
      // Double 6 bonus — player gets to roll again
      setPendingRollAgain(false);pendingRef.current=false;
      diceLeftRef.current=[];setDiceLeft([]);
      setGamePhase('IDLE');phaseRef.current='IDLE';
      const pNum=isP1Turn_(turnIdxRef.current)?'1':'2';
      updateLabel(turnIdxRef.current,`Player ${pNum} — Double 6! Roll again 🎲`);
      return;
    }
    nextTurn(turnIdxRef.current);
  }

  function handleTokenClick(p,idx){
    if(phaseRef.current!=='SELECT_PIECE'||animRef.current)return;
    if(!curTeam(turnIdxRef.current).includes(p))return;
    if(!highlighted.includes(`${p}-${idx}`))return;
    const clickPos=posRef.current[p][idx];

    // FIX 1: Only show stack picker for tokens ON THE BOARD (not in base)
    // Base tokens (-1) always just move directly
    if(clickPos===-1){
      doMove(p,idx);
      return;
    }

    // Check for other tokens on the EXACT same board square
    const stacked=[];
    curTeam(turnIdxRef.current).forEach(tp=>{
      for(let ti=0;ti<4;ti++){
        if(!(tp===p&&ti===idx)
          &&posRef.current[tp][ti]===clickPos
          &&posRef.current[tp][ti]!==-1  // not in base
          &&canMove(tp,ti,activeDie,activeIsCombined))
          stacked.push({p:tp,i:ti});
      }
    });
    if(stacked.length>0){stacked.unshift({p,i:idx});setStackPicker(stacked);}
    else doMove(p,idx);
  }

  function playAgain(){
    const init={P1:[-1,-1,-1,-1],P2:[-1,-1,-1,-1],P3:[-1,-1,-1,-1],P4:[-1,-1,-1,-1]};
    setPositions(init);posRef.current=init;
    diceLeftRef.current=[];setDiceLeft([]);
    setGamePhase('IDLE');phaseRef.current='IDLE';
    setCurrentTurnIdx(0);turnIdxRef.current=0;
    setPendingRollAgain(false);pendingRef.current=false;
    setWinner(null);setHighlighted([]);gameOverRef.current=false;timerOwnerRef.current=null;
    setDiceValues([1,1]);setResultText('–, –');
    updateLabel(0);
  }

  return(
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center py-3 px-2">

      {/* Scores */}
      <div className="flex gap-2 w-full max-w-sm mb-2">
        <div className={`flex-1 py-2 px-3 rounded-xl text-center transition-all ${isP1Turn?'bg-gradient-to-r from-red-600 to-red-700 ring-2 ring-yellow-400':'bg-[#ffffff10]'}`}>
          <p className="text-white text-xs font-bold">Player 1</p>
          <p className="text-white text-xl font-black">{score1}</p>
        </div>
        <div className={`flex-1 py-2 px-3 rounded-xl text-center transition-all ${!isP1Turn?'bg-gradient-to-r from-green-700 to-green-800 ring-2 ring-yellow-400':'bg-[#ffffff10]'}`}>
          <p className="text-white text-xs font-bold">Player 2</p>
          <p className="text-white text-xl font-black">{score2}</p>
        </div>
      </div>

      {/* Board */}
      <div ref={boardRef} className="relative w-full max-w-sm aspect-square rounded-xl overflow-hidden shadow-2xl mb-2">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>
        {['P1','P2','P3','P4'].map(p=>
          positions[p].map((pos,i)=>{
            const isBase=(pos===-1);
            const isDone=(pos===299);
            let lx,ly;
            if(isBase){
              const[x,y]=BASE_COORDS[p][i];
              const r=toPct(x,y,true);lx=r.lx;ly=r.ly;
            } else if(isDone){
              // ALL done tokens sit exactly at HOME_FINAL — perfectly stacked
              const[hx,hy]=HOME_FINAL[p];
              const r=toPct(hx,hy,false);lx=r.lx;ly=r.ly;
            } else {
              const[x,y]=getXY(p,pos);
              const r=toPct(x,y,false);lx=r.lx;ly=r.ly;
            }
            const key=`${p}-${i}`;
            const isHl=highlighted.includes(key);
            return(
              <div key={key}
                onClick={()=>!isDone&&handleTokenClick(p,i)}
                style={{
                  left:lx,top:ly,
                  background:`radial-gradient(circle at 35% 30%, ${COLORS[p]}dd, ${COLORS[p]}88)`,
                  borderColor:isHl?'gold':isDone?COLORS[p]:'white',
                  boxShadow:isHl?'0 0 10px 3px gold':isDone?`0 0 8px 3px ${COLORS[p]}`:'0 2px 4px rgba(0,0,0,0.5)',
                  cursor:isDone?'default':isHl?'pointer':'default',
                  zIndex:isDone?3:isHl?10:5,
                  transition:'all 0.2s',
                }}
                className={`absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 ${isHl?'animate-pulse w-[5.5%] h-[5.5%]':isDone?'w-[4.5%] h-[4.5%]':'w-[4.5%] h-[4.5%]'}`}
              />
            );
          })
        )}
      </div>

      {/* Dice */}
      <div className="flex gap-3 items-center bg-[#0d4a5a] px-4 py-2 rounded-2xl mb-1">
        <DieFace value={diceValues[0]} rolling={rolling}/>
        <DieFace value={diceValues[1]} rolling={rolling}/>
      </div>
      <p className="text-gray-400 text-xs mb-1">{resultText}</p>

      {/* Timer — runs the WHOLE turn including after rolling */}
      <div className="w-full max-w-sm mb-2">
        <div className="bg-[#ffffff10] rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-1000"
            style={{
              width:`${(timerSeconds/TIMER_TOTAL)*100}%`,
              background:timerSeconds>30?'#27ae60':timerSeconds>10?'#f39c12':'#e74c3c'
            }}/>
        </div>
        <p className={`text-center text-xs mt-0.5 font-bold ${timerSeconds<=10?'text-red-400':timerSeconds<=30?'text-yellow-400':'text-gray-400'}`}>
          {timerSeconds}s remaining
        </p>
      </div>

      {/* Dice pills */}
      {(gamePhase==='SELECT_DIE')&&(
        <div className="flex gap-2 mb-2 flex-wrap justify-center">
          <button onClick={()=>selectDie(pillVal1,false)}
            className={`px-4 py-2 rounded-xl font-bold text-sm text-white transition-all ${activeDie===pillVal1?'ring-2 ring-yellow-400 bg-blue-600':'bg-blue-900 hover:bg-blue-800'}`}>
            Use {pillVal1}
          </button>
          {diceLeft.length===2&&(
            <button onClick={()=>selectDie(pillVal2,false)}
              className={`px-4 py-2 rounded-xl font-bold text-sm text-white transition-all ${activeDie===pillVal2?'ring-2 ring-yellow-400 bg-red-600':'bg-red-900 hover:bg-red-800'}`}>
              Use {pillVal2}
            </button>
          )}
          {diceLeft.length===2&&(
            <button onClick={()=>selectDie(pillValC,true)}
              className={`px-4 py-2 rounded-xl font-bold text-sm text-white transition-all ${activeDie===pillValC?'ring-2 ring-yellow-400 bg-green-600':'bg-green-900 hover:bg-green-800'}`}>
              Combine {pillValC}
            </button>
          )}
        </div>
      )}

      {/* Roll button */}
      <button
        onClick={handleRoll}
        disabled={gamePhase!=='IDLE'||isAnimating||!!winner}
        className="w-full max-w-sm py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-base disabled:opacity-40 disabled:cursor-not-allowed mb-2 transition-all active:scale-95"
      >
        🎲 Roll Dice
      </button>

      {/* Turn label */}
      <div className={`w-full max-w-sm py-2 px-4 rounded-xl text-center text-sm font-bold text-white transition-all ${isP1Turn?'bg-red-700':'bg-green-700'}`}>
        {turnText}
      </div>

      {/* Timer warning popup */}
      {showWarning&&(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2a3a] border-2 border-red-500 rounded-2xl p-6 text-center max-w-xs w-full">
            <p className="text-4xl mb-2">⏰</p>
            <p className="text-red-400 font-black text-lg mb-2">Time is running out!</p>
            <p className="text-gray-300 text-sm mb-4">10 seconds left — roll and move now!</p>
            <button onClick={()=>setShowWarning(false)}
              className="px-6 py-2 bg-green-500 rounded-xl text-white font-bold active:scale-95">
              I'm here! ✓
            </button>
          </div>
        </div>
      )}

      {/* Stack picker */}
      {stackPicker&&(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2a3a] border-2 border-blue-400 rounded-2xl p-4 max-w-xs w-full">
            <p className="text-white font-bold text-center mb-3 text-sm">Which token to move?</p>
            {stackPicker.map(({p,i})=>(
              <button key={`${p}-${i}`}
                onClick={()=>{setStackPicker(null);doMove(p,i);}}
                style={{background:COLORS[p]}}
                className="block w-full py-2.5 rounded-xl text-white font-bold mb-2 text-sm active:scale-95">
                Move {TOKEN_NAMES[p]} token
              </button>
            ))}
            <button onClick={()=>setStackPicker(null)}
              className="block w-full py-2 rounded-xl bg-gray-600 text-white font-bold text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Winner screen */}
      {winner&&(
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2a3a] border-2 border-yellow-400 rounded-2xl p-8 text-center max-w-xs w-full">
            <p className="text-6xl mb-3">{winner.reason==='timeout'?'⏰':'🏆'}</p>
            <p className="text-yellow-400 font-black text-2xl mb-1">{winner.name} Wins!</p>
            <p className="text-gray-400 text-sm mb-2">
              {winner.reason==='timeout'?'Opponent timed out':'All tokens home!'}
            </p>
            <p className="text-gray-300 text-sm mb-6">Score — P1: {score1} | P2: {score2}</p>
            <button onClick={playAgain}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-lg mb-3 active:scale-95">
              🎮 Play Again
            </button>
            <button onClick={()=>router.push('/menu')}
              className="w-full py-3 rounded-2xl bg-[#ffffff15] text-white font-bold active:scale-95">
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePage(){
  return(
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <p className="text-white text-xl">Loading game...</p>
      </div>
    }>
      <GameBoard/>
    </Suspense>
  );
}