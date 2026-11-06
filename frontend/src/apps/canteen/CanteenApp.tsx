import { useState } from 'react';
import styles from './canteen.module.css';
import '../../styles/tokens-operational.css';
import { RequireAuth } from '../../components/RequireAuth';
import LoginScreen from './screens/LoginScreen';
import MealSelectorScreen from './screens/MealSelectorScreen';
import ScanScreen from './screens/ScanScreen';
import { useCanteenSession } from './useCanteenSession';

type Screen = 'meals' | 'scan';

function CanteenAuthed() {
  const [screen, setScreen] = useState<Screen>('meals');
  const session = useCanteenSession();

  async function handleStart() {
    await session.startMealService();
    setScreen('scan');
  }

  return (
    <>
      {screen === 'meals' && (
        <MealSelectorScreen currentMeal={session.currentMeal} onSelectMeal={session.selectMeal} onStart={handleStart} />
      )}
      {screen === 'scan' && (
        <ScanScreen
          currentMeal={session.currentMeal}
          tapCount={session.tapCount}
          scanCount={session.scanCount}
          result={session.result}
          onScan={session.performMealScan}
          onChangeTap={session.changeTap}
          onChangeKpCount={session.changeKpCount}
          onDismissResult={session.dismissResult}
          onBack={() => setScreen('meals')}
        />
      )}
    </>
  );
}

export default function CanteenApp() {
  return (
    <div className={`theme-operational ${styles.page}`}>
      <RequireAuth fallback={<LoginScreen />}>
        <CanteenAuthed />
      </RequireAuth>
    </div>
  );
}
