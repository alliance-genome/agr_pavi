'use client';

import { PrimeReactContext } from 'primereact/api';
import { ToggleButton } from "primereact/togglebutton";
import React, { FunctionComponent, useContext, useState } from 'react';

export const DarkModeToggle: FunctionComponent<{}> = () => {
    const [darkMode, setDarkMode] = useState(false)
    const { changeTheme } = useContext(PrimeReactContext);

    function toggleDarkMode(darkMode: boolean) {
        console.log(`Toggling dark mode to ${darkMode?'enabled':'disabled'}.`)
        setDarkMode(darkMode)
        if( changeTheme ) {
            const oldThemeId = `mdc-${!darkMode?'dark':'light'}-indigo`
            const newThemeId = `mdc-${darkMode?'dark':'light'}-indigo`
            changeTheme(oldThemeId,newThemeId,'theme-link')
        }
        else {
            console.warn(`changeTheme not truthy (${changeTheme}), darkMode toggle not functional.`)
        }
    }

    return (
        <div >
            <ToggleButton onLabel="" onIcon="pi pi-moon"
                        offLabel="" offIcon="pi pi-sun"
                        tooltip='toggle dark mode'
                        checked={darkMode} onChange={(e) => toggleDarkMode(e.value)} />
        </div>
    );
}
