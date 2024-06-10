import { PrimeReactProvider } from 'primereact/api';
import {Button} from 'primereact/button'

export default function Home() {
  return (
    <div>
      <PrimeReactProvider>
        <Button label='Style-testing button'></Button>
      </PrimeReactProvider>
    </div>
  );
}
