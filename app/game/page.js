'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '../firebase';
import { ref, onValue, update, get } from 'firebase/database';

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

const INIT_POSITIONS={P1:[-1,-1,-1,-1],P2:[-1,-1,-1,-1],P3:[-1,-1,-1,-1],P4:[-1,-1,-1,-1]};

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
  const params=useSearchParams();
  const roomCode=params.get('code');
  const playerNum=parseInt(params.get('player')||'1');
  // playerNum=1 means this user is Player1 (controls P3,P4)
  // playerNum=2 means this user is Player2 (controls P1,P2)
  const myTeam=playerNum===1?PLAYER1:PLAYER2;

  const boardRef=useRef(null);
  const canvasRef=useRef(null);

  const [positions,setPositions]=useState(INIT_POSITIONS);
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
  const [turnText,setTurnText]=useState('');
  const [isP1Turn,setIsP1Turn]=useState(true);
  const [highlighted,setHighlighted]=useState([]);
  const [timerSeconds,setTimerSeconds]=useState(TIMER_TOTAL);
  const [showWarning,setShowWarning]=useState(false);
  const [winner,setWinner]=useState(null);
  const [originalDice,setOriginalDice]=useState([1,1]);
  const [rolling,setRolling]=useState(false);
  const [stackPicker,setStackPicker]=useState(null);
  const [opponentJoined,setOpponentJoined]=useState(false);
  const [myTurn,setMyTurn]=useState(false);

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
  const timerOwnerRef=useRef(null);
  const isListeningRef=useRef(false);

  useEffect(()=>{posRef.current=positions;},[positions]);
  useEffect(()=>{diceLeftRef.current=diceLeft;},[diceLeft]);
  useEffect(()=>{phaseRef.current=gamePhase;},[gamePhase]);
  useEffect(()=>{animRef.current=isAnimating;},[isAnimating]);
  useEffect(()=>{turnIdxRef.current=currentTurnIdx;},[currentTurnIdx]);
  useEffect(()=>{origDiceRef.current=originalDice;},[originalDice]);
  useEffect(()=>{pendingRef.current=pendingRollAgain;},[pendingRollAgain]);

  function curTeam(idx){return PLAYER1.includes(TURN_ORDER[idx])?PLAYER1:PLAYER2;}
  function isP1Turn_(idx){return PLAYER1.includes(TURN_ORDER[idx]);}
  function isMyTurn(idx){
    const team=curTeam(idx);
    return playerNum===1?team===PLAYER1:team===PLAYER2;
  }

  // ── FIREBASE LISTENER ─────────────────────────────────────
  useEffect(()=>{
    if(!roomCode||isListeningRef.current)return;
    isListeningRef.current=true;

    const roomRef=ref(db,`rooms/${roomCode}`);
    const unsubscribe=onValue(roomRef,(snapshot)=>{
      if(!snapshot.exists())return;
      const data=snapshot.val();

      // Check opponent joined
      if(data.player2)setOpponentJoined(true);

      // Sync game state from Firebase
      if(data.gameState){
        const gs=data.gameState;

        // Update positions
        if(gs.positions){
          const pos={
            P1:gs.positions.P1||[-1,-1,-1,-1],
            P2:gs.positions.P2||[-1,-1,-1,-1],
            P3:gs.positions.P3||[-1,-1,-1,-1],
            P4:gs.positions.P4||[-1,-1,-1,-1],
          };
          setPositions(pos);
          posRef.current=pos;
        }

        // Update turn
        if(gs.currentTurnIdx!==undefined){
          setCurrentTurnIdx(gs.currentTurnIdx);
          turnIdxRef.current=gs.currentTurnIdx;
          const myT=isMyTurn(gs.currentTurnIdx);
          setMyTurn(myT);
          updateLabel(gs.currentTurnIdx,null,myT);
        }

        // Update dice
        if(gs.diceValues){
          setDiceValues(gs.diceValues);
          setResultText(`${gs.diceValues[0]}, ${gs.diceValues[1]}  (${gs.diceValues[0]+gs.diceValues[1]})`);
        }
        // diceLeft and phase are NEVER read from Firebase
        // Each player manages their own dice state locally
        // Only reset to IDLE when turn changes to opponent
        if(gs.currentTurnIdx!==undefined){
          const isMine=isMyTurn(gs.currentTurnIdx);
          if(!isMine&&phaseRef.current!=='IDLE'&&phaseRef.current!=='MOVING'){
            // It's opponent's turn now - reset our local state
            setGamePhase('IDLE');phaseRef.current='IDLE';
            diceLeftRef.current=[];setDiceLeft([]);
            setHighlighted([]);setActiveDie(null);
          }
        }
        if(gs.phase){
          // Only update phase for opponent actions, never override our own SELECT_DIE
          const isMine=isMyTurn(gs.currentTurnIdx||0);
          if(!isMine){
            // Don't set phase from Firebase - we handle it locally
            // Just ensure we're in IDLE when it's not our turn
            if(gs.phase==='IDLE'&&phaseRef.current!=='IDLE'){
          }
        }
        if(gs.originalDice){
          setOriginalDice(gs.originalDice);
          origDiceRef.current=gs.originalDice;
        }
        if(gs.pendingRollAgain!==undefined){
          setPendingRollAgain(gs.pendingRollAgain);
          pendingRef.current=gs.pendingRollAgain;
        }
        if(gs.winner){
          setWinner(gs.winner);
          gameOverRef.current=true;
          stopTimer();
        }
        if(gs.score1!==undefined)setScore1(gs.score1);
        if(gs.score2!==undefined)setScore2(gs.score2);
      }
    });

    return()=>unsubscribe();
  // eslint-disable-next-line
  },[roomCode]);

  // Check if it's my turn on mount and turn change
  useEffect(()=>{
    const myT=isMyTurn(currentTurnIdx);
    setMyTurn(myT);
  // eslint-disable-next-line
  },[currentTurnIdx]);

  // ── TIMER ─────────────────────────────────────────────────
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
          if(gameOverRef.current)return 0;
          gameOverRef.current=true;
          const losing=isP1Turn_(turnIdxRef.current);
          const w=losing?'Player 2':'Player 1';
          const newS1=losing?score1:score1+1;
          const newS2=losing?score2+1:score2;
          setScore1(newS1);setScore2(newS2);
          const win={name:w,reason:'timeout'};
          setWinner(win);
          setGamePhase('GAMEOVER');
          if(roomCode){
            update(ref(db,`rooms/${roomCode}/gameState`),{
              winner:win,score1:newS1,score2:newS2
            });
          }
          return 0;
        }
        return next;
      });
    },1000);
  }

  function stopTimer(){
    if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
  }

  useEffect(()=>{
    if(winner||gameOverRef.current)return;
    const humanOwner=isP1Turn_(currentTurnIdx)?'P1':'P2';
    if(timerOwnerRef.current!==humanOwner){
      timerOwnerRef.current=humanOwner;
      startTimer();
    }
    return()=>{};
  // eslint-disable-next-line
  },[currentTurnIdx,winner]);

  // ── DRAW BOARD ────────────────────────────────────────────
  function drawBoard(){
    const canvas=canvasRef.current;
    const board=boardRef.current;
    if(!canvas||!board)return;
    const S=board.offsetWidth;
    if(S===0)return;
    canvas.width=S;canvas.height=S;
    const C=S/15;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f5f0e8';ctx.fillRect(0,0,S,S);
    [{c:0,r:0,fill:'#2ecc71'},{c:9,r:0,fill:'#f1c40f'},{c:0,r:9,fill:'#e74c3c'},{c:9,r:9,fill:'#3498db'}].forEach(({c,r,fill})=>{
      ctx.fillStyle=fill;ctx.fillRect(c*C,r*C,6*C,6*C);
    });
    const bc={P2:[[1.5,1.5],[4,1.5],[1.5,4],[4,4]],P4:[[10.5,1.5],[13,1.5],[10.5,4],[13,4]],P3:[[1.5,10.5],[4,10.5],[1.5,13],[4,13]],P1:[[10.5,10.5],[13,10.5],[10.5,13],[13,13]]};
    const bcolors={P1:'#3498db',P2:'#2ecc71',P3:'#e74c3c',P4:'#f1c40f'};
    Object.entries(bc).forEach(([p,circles])=>{
      circles.forEach(([cx,cy])=>{
        ctx.beginPath();ctx.arc(cx*C,cy*C,C*0.55,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fill();
        ctx.strokeStyle=bcolors[p];ctx.lineWidth=2.5;ctx.stroke();
      });
    });
    ctx.fillStyle='white';
    ctx.fillRect(6*C,0,3*C,15*C);ctx.fillRect(0,6*C,15*C,3*C);
    [{fill:'#f1c40f',sq:[[7,1],[7,2],[7,3],[7,4],[7,5]]},
     {fill:'#e74c3c',sq:[[7,9],[7,10],[7,11],[7,12],[7,13]]},
     {fill:'#3498db',sq:[[9,7],[10,7],[11,7],[12,7],[13,7]]},
     {fill:'#2ecc71',sq:[[1,7],[2,7],[3,7],[4,7],[5,7]]}
    ].forEach(({fill,sq})=>{ctx.fillStyle=fill;sq.forEach(([c,r])=>ctx.fillRect(c*C,r*C,C,C));});
    const cx2=7.5*C,cy2=7.5*C;
    ctx.beginPath();ctx.arc(cx2,cy2,C*1.2,0,Math.PI*2);ctx.fillStyle='#f0ede8';ctx.fill();
    ctx.beginPath();ctx.arc(cx2,cy2,C*0.5,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=0.6;
    for(let r=0;r<15;r++)for(let c=6;c<9;c++)ctx.strokeRect(c*C,r*C,C,C);
    for(let r=6;r<9;r++)for(let c=0;c<15;c++)ctx.strokeRect(c*C,r*C,C,C);
    ctx.strokeStyle='#888';ctx.lineWidth=2;ctx.strokeRect(1,1,S-2,S-2);
  }

  useEffect(()=>{
    // Draw immediately and also after delays to catch late renders
    drawBoard();
    const t1=setTimeout(drawBoard,100);
    const t2=setTimeout(drawBoard,500);
    const t3=setTimeout(drawBoard,1000);
    // Also use ResizeObserver
    const ro=new ResizeObserver(drawBoard);
    if(boardRef.current)ro.observe(boardRef.current);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);ro.disconnect();};
  // eslint-disable-next-line
  },[opponentJoined]);

  // ── SYNC TO FIREBASE ──────────────────────────────────────
  async function syncState(updates){
    if(!roomCode)return;
    await update(ref(db,`rooms/${roomCode}/gameState`),updates);
  }

  // ── MOVE HELPERS ──────────────────────────────────────────
  function stepsToHome(p,pos){
    if(pos>=200)return(204-pos)+1;
    const turn=TURN_IDX[p];
    const stepsToTurn=pos<=turn?(turn-pos):(52-pos+turn);
    return stepsToTurn+6;
  }
  function canMove(p,i,val,isCombined){
    const pos=posRef.current[p][i];
    if(pos===299)return false;
    if(pos===-1)return val===6&&!isCombined&&diceLeftRef.current.includes(6);
    if(pos>=200)return val<=(204-pos)+1;
    const steps=stepsToHome(p,pos);
    if(val>steps)return false;
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

  function updateLabel(idx,msg,isMyT){
    const p=TURN_ORDER[idx];
    const pNum=isP1Turn_(idx)?'1':'2';
    setIsP1Turn(isP1Turn_(idx));
    const whose=isMyT?(isMyT?'Your':'Opponent'):(isMyTurn(idx)?'Your':'Opponent');
    setTurnText(msg||(isMyT?`Your Turn — ${TOKEN_NAMES[p]} token`:`Opponent's Turn — ${TOKEN_NAMES[p]} token`));
  }

  // ── ROLL ──────────────────────────────────────────────────
  async function handleRoll(){
    if(phaseRef.current!=='IDLE'||animRef.current||winner)return;
    if(!myTurn)return; // Not your turn!

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
      updateLabel(turnIdxRef.current,'No valid move — passing turn',true);
      // sync and pass turn
      const next=(turnIdxRef.current+1)%TURN_ORDER.length;
      await syncState({
        diceValues:[d1,d2],
        diceLeft:[],
        currentTurnIdx:next,
        phase:'IDLE',
        originalDice:[d1,d2],
        pendingRollAgain:false,
      });
      await new Promise(r=>setTimeout(r,1200));
      nextTurn(turnIdxRef.current);
      return;
    }

    setGamePhase('SELECT_DIE');phaseRef.current='SELECT_DIE';
    setPillVal1(d1);setPillVal2(d2);setPillValC(d1+d2);
    updateLabel(turnIdxRef.current,null,true);

    // Sync roll to Firebase — sync dice display only, NOT diceLeft
    // diceLeft is local state only, never shared to avoid spill-over bug
    await syncState({
      diceValues:[d1,d2],
      currentTurnIdx:turnIdxRef.current,
      originalDice:[d1,d2],
      pendingRollAgain:d1===6&&d2===6,
    });
  }

  function selectDie(val,isCombined){
    if(!myTurn)return;
    setActiveDie(val);setActiveIsCombined(isCombined);
    const team=curTeam(turnIdxRef.current);
    const elig=getEligible(team,val,isCombined);
    if(elig.length>0){
      setHighlighted(elig.map(e=>`${e.p}-${e.i}`));
      setGamePhase('SELECT_PIECE');phaseRef.current='SELECT_PIECE';
      updateLabel(turnIdxRef.current,`Click a glowing token — ${val} step${val>1?'s':''}`,true);
    } else {
      setActiveDie(null);setActiveIsCombined(false);
      updateLabel(turnIdxRef.current,`No token can use ${val} — pick another`,true);
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
        if(nxt===299){
          clearInterval(iv);
          setTimeout(()=>{checkWin(posRef.current);},100);
          resolve(pos);return;
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
    return landPos;
  }

  function checkWin(pos){
    const p1Won=PLAYER1.every(p=>pos[p].every(v=>v===299));
    const p2Won=PLAYER2.every(p=>pos[p].every(v=>v===299));
    if(p1Won){
      if(gameOverRef.current)return true;
      gameOverRef.current=true;
      stopTimer();
      const newS1=score1+1;
      setScore1(newS1);
      const win={name:'Player 1',reason:'win'};
      setWinner(win);setGamePhase('GAMEOVER');
      syncState({winner:win,score1:newS1,score2});
      return true;
    }
    if(p2Won){
      if(gameOverRef.current)return true;
      gameOverRef.current=true;
      stopTimer();
      const newS2=score2+1;
      setScore2(newS2);
      const win={name:'Player 2',reason:'win'};
      setWinner(win);setGamePhase('GAMEOVER');
      syncState({winner:win,score1,score2:newS2});
      return true;
    }
    return false;
  }

  function nextTurn(curIdx){
    setHighlighted([]);
    diceLeftRef.current=[];setDiceLeft([]);
    setActiveDie(null);setActiveIsCombined(false);
    setPendingRollAgain(false);pendingRef.current=false;
    const next=(curIdx+1)%TURN_ORDER.length;
    setCurrentTurnIdx(next);turnIdxRef.current=next;
    setGamePhase('IDLE');phaseRef.current='IDLE';
    const myT=isMyTurn(next);
    setMyTurn(myT);
    updateLabel(next,null,myT);
  }

  async function doMove(p,idx){
    if(!myTurn)return;
    setIsAnimating(true);animRef.current=true;
    setHighlighted([]);setGamePhase('MOVING');phaseRef.current='MOVING';
    await applyMove(p,idx,activeDie,activeIsCombined);
    setActiveDie(null);setActiveIsCombined(false);
    setIsAnimating(false);animRef.current=false;
    if(gameOverRef.current)return;
    if(checkWin(posRef.current))return;

    const dl=diceLeftRef.current;
    let nextIdx=turnIdxRef.current;
    let newPhase='IDLE';
    let newDiceLeft=[];

    if(dl.length>0){
      const rv=dl[0];
      const elig=getEligible(curTeam(turnIdxRef.current),rv,false);
      if(elig.length>0){
        setGamePhase('SELECT_DIE');phaseRef.current='SELECT_DIE';
        setPillVal1(rv);
        updateLabel(turnIdxRef.current,`Use your remaining die (${rv})`,true);
        newPhase='SELECT_DIE';
        newDiceLeft=dl;
        // Sync current state
        await syncState({
          positions:posRef.current,
          currentTurnIdx:nextIdx,
        });
        return;
      } else {
        diceLeftRef.current=[];setDiceLeft([]);
      }
    }

    if(pendingRef.current){
      setPendingRollAgain(false);pendingRef.current=false;
      diceLeftRef.current=[];setDiceLeft([]);
      setGamePhase('IDLE');phaseRef.current='IDLE';
      const myT=isMyTurn(turnIdxRef.current);
      setMyTurn(myT);
      updateLabel(turnIdxRef.current,`Double 6! Roll again 🎲`,myT);
      await syncState({
        positions:posRef.current,
        diceLeft:[],
        currentTurnIdx:nextIdx,
        phase:'IDLE',
        pendingRollAgain:false,
      });
      return;
    }

    // Pass turn
    nextIdx=(turnIdxRef.current+1)%TURN_ORDER.length;
    nextTurn(turnIdxRef.current);
    await syncState({
      positions:posRef.current,
      diceLeft:[],
      currentTurnIdx:nextIdx,
      phase:'IDLE',
      pendingRollAgain:false,
    });
  }

  function handleTokenClick(p,idx){
    if(phaseRef.current!=='SELECT_PIECE'||animRef.current)return;
    if(!myTurn)return;
    if(!curTeam(turnIdxRef.current).includes(p))return;
    if(!highlighted.includes(`${p}-${idx}`))return;
    const clickPos=posRef.current[p][idx];
    if(clickPos===-1){doMove(p,idx);return;}
    const stacked=[];
    curTeam(turnIdxRef.current).forEach(tp=>{
      for(let ti=0;ti<4;ti++){
        if(!(tp===p&&ti===idx)&&posRef.current[tp][ti]===clickPos&&posRef.current[tp][ti]!==-1&&canMove(tp,ti,activeDie,activeIsCombined))
          stacked.push({p:tp,i:ti});
      }
    });
    if(stacked.length>0){stacked.unshift({p,i:idx});setStackPicker(stacked);}
    else doMove(p,idx);
  }

  async function playAgain(){
    const init=INIT_POSITIONS;
    setPositions(init);posRef.current=init;
    diceLeftRef.current=[];setDiceLeft([]);
    setGamePhase('IDLE');phaseRef.current='IDLE';
    setCurrentTurnIdx(0);turnIdxRef.current=0;
    setPendingRollAgain(false);pendingRef.current=false;
    setWinner(null);gameOverRef.current=false;
    setHighlighted([]);
    setDiceValues([1,1]);setResultText('–, –');
    timerOwnerRef.current=null;
    const myT=isMyTurn(0);setMyTurn(myT);
    updateLabel(0,null,myT);
    await syncState({
      positions:init,
      diceLeft:[],
      currentTurnIdx:0,
      phase:'IDLE',
      pendingRollAgain:false,
      winner:null,
      diceValues:[1,1],
    });
  }

  // Waiting for opponent screen
  if(!opponentJoined&&playerNum===1){
    return(
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center px-4">
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-white font-black text-xl mb-2">Waiting for opponent...</h2>
        <p className="text-gray-400 text-sm mb-6">Share your room code: <span className="text-yellow-400 font-black">{roomCode}</span></p>
        <div className="flex gap-1 mb-6">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{animationDelay:'0ms'}}/>
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{animationDelay:'150ms'}}/>
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{animationDelay:'300ms'}}/>
        </div>
        <button onClick={()=>router.push('/play')} className="text-gray-400 text-sm">← Cancel</button>
      </div>
    );
  }

  return(
    <div className="h-screen bg-[#1a1a2e] flex flex-col items-center overflow-hidden px-2 pt-2 pb-1">

      {/* My turn indicator */}
      {myTurn&&!winner&&(
        <div className="w-full max-w-sm mb-1 py-0.5 px-3 rounded-lg bg-yellow-400/20 border border-yellow-400/50 text-center">
          <p className="text-yellow-400 text-xs font-bold">⚡ YOUR TURN</p>
        </div>
      )}

      {/* Scores */}
      <div className="flex gap-2 w-full max-w-sm mb-1">
        <div className={`flex-1 py-1.5 px-3 rounded-xl text-center transition-all ${isP1Turn?'bg-gradient-to-r from-red-600 to-red-700 ring-2 ring-yellow-400':'bg-[#ffffff10]'}`}>
          <p className="text-white text-xs font-bold">P1 {playerNum===1?'(You)':''}</p>
          <p className="text-white text-lg font-black">{score1}</p>
        </div>
        <div className={`flex-1 py-1.5 px-3 rounded-xl text-center transition-all ${!isP1Turn?'bg-gradient-to-r from-green-700 to-green-800 ring-2 ring-yellow-400':'bg-[#ffffff10]'}`}>
          <p className="text-white text-xs font-bold">P2 {playerNum===2?'(You)':''}</p>
          <p className="text-white text-lg font-black">{score2}</p>
        </div>
      </div>

      {/* Board */}
      <div ref={boardRef} className="relative w-full max-w-sm aspect-square rounded-xl overflow-hidden shadow-2xl mb-1" style={{maxHeight:'45vh'}}>
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
                className={`absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 ${isHl?'animate-pulse w-[5.5%] h-[5.5%]':'w-[4.5%] h-[4.5%]'}`}
              />
            );
          })
        )}
      </div>

      {/* Dice + Timer row */}
      <div className="flex items-center gap-3 w-full max-w-sm mb-1">
        <div className="flex gap-2 items-center bg-[#0d4a5a] px-3 py-1.5 rounded-xl">
          <DieFace value={diceValues[0]} rolling={rolling}/>
          <DieFace value={diceValues[1]} rolling={rolling}/>
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-xs mb-0.5">{resultText}</p>
          <div className="bg-[#ffffff10] rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-1000"
              style={{width:`${(timerSeconds/TIMER_TOTAL)*100}%`,background:timerSeconds>30?'#27ae60':timerSeconds>10?'#f39c12':'#e74c3c'}}/>
          </div>
          <p className={`text-xs font-bold mt-0.5 ${timerSeconds<=10?'text-red-400':timerSeconds<=30?'text-yellow-400':'text-gray-400'}`}>
            {timerSeconds}s
          </p>
        </div>
      </div>

      {/* Pills — only show on my turn */}
      {(gamePhase==='SELECT_DIE')&&myTurn&&(
        <div className="flex gap-2 mb-1 flex-wrap justify-center">
          <button onClick={()=>selectDie(pillVal1,false)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs text-white transition-all ${activeDie===pillVal1?'ring-2 ring-yellow-400 bg-blue-600':'bg-blue-900'}`}>
            Use {pillVal1}
          </button>
          {diceLeft.length===2&&(
            <button onClick={()=>selectDie(pillVal2,false)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs text-white transition-all ${activeDie===pillVal2?'ring-2 ring-yellow-400 bg-red-600':'bg-red-900'}`}>
              Use {pillVal2}
            </button>
          )}
          {diceLeft.length===2&&(
            <button onClick={()=>selectDie(pillValC,true)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs text-white transition-all ${activeDie===pillValC?'ring-2 ring-yellow-400 bg-green-600':'bg-green-900'}`}>
              Combine {pillValC}
            </button>
          )}
        </div>
      )}

      {/* Roll button — only enabled on my turn */}
      <button
        onClick={handleRoll}
        disabled={gamePhase!=='IDLE'||isAnimating||!!winner||!myTurn}
        className="w-full max-w-sm py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-base disabled:opacity-40 disabled:cursor-not-allowed mb-2 transition-all active:scale-95"
      >
        {myTurn?'🎲 Roll Dice':'⏳ Opponent\'s turn...'}
      </button>

      {/* Turn label */}
      <div className={`w-full max-w-sm py-2 px-4 rounded-xl text-center text-sm font-bold text-white ${isP1Turn?'bg-red-700':'bg-green-700'}`}>
        {turnText}
      </div>

      {/* Timer warning — full popup only for active player */}
      {showWarning&&myTurn&&(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2a3a] border-2 border-red-500 rounded-2xl p-6 text-center max-w-xs w-full">
            <p className="text-4xl mb-2">⏰</p>
            <p className="text-red-400 font-black text-lg mb-2">Time is running out!</p>
            <p className="text-gray-300 text-sm mb-4">10 seconds left — roll and move now!</p>
            <button onClick={()=>setShowWarning(false)} className="px-6 py-2 bg-green-500 rounded-xl text-white font-bold">I'm here! ✓</button>
          </div>
        </div>
      )}
      {/* Quiet notification for waiting player */}
      {showWarning&&!myTurn&&(
        <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
          <div className="bg-orange-500/90 rounded-xl px-4 py-2 text-center">
            <p className="text-white text-xs font-bold">⏰ Opponent is running out of time...</p>
          </div>
        </div>
      )}

      {/* Stack picker */}
      {stackPicker&&(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2a3a] border-2 border-blue-400 rounded-2xl p-4 max-w-xs w-full">
            <p className="text-white font-bold text-center mb-3 text-sm">Which token to move?</p>
            {stackPicker.map(({p,i})=>(
              <button key={`${p}-${i}`} onClick={()=>{setStackPicker(null);doMove(p,i);}}
                style={{background:COLORS[p]}}
                className="block w-full py-2.5 rounded-xl text-white font-bold mb-2 text-sm active:scale-95">
                Move {TOKEN_NAMES[p]} token
              </button>
            ))}
            <button onClick={()=>setStackPicker(null)} className="block w-full py-2 rounded-xl bg-gray-600 text-white font-bold text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Winner screen */}
      {winner&&(
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a2a3a] border-2 border-yellow-400 rounded-2xl p-8 text-center max-w-xs w-full">
            <p className="text-6xl mb-3">{winner.reason==='timeout'?'⏰':'🏆'}</p>
            <p className="text-yellow-400 font-black text-2xl mb-1">{winner.name} Wins!</p>
            <p className="text-gray-400 text-sm mb-2">{winner.reason==='timeout'?'Timed out':'All tokens home!'}</p>
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
    <Suspense fallback={<div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center"><p className="text-white text-xl">Loading game...</p></div>}>
      <GameBoard/>
    </Suspense>
  );
}