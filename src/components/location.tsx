/**
 * Location
 */

import React, { useState } from 'react'
import { render, Text, Box, Newline } from 'ink'
import Title from './elements/title'
import Steps from './elements/steps'

import yaml from 'js-yaml'
import fs from 'fs'
import { ISettings, IBranding } from '../interfaces/'


type LocationProps = {
    region?: string,
    zone?: string,
    language?: string,
    dateNumbers?: string
}

export default function Location({ region = '', zone = '', language = '', dateNumbers = '' }: LocationProps) {
    let installer = 'krill'
    let productName = 'unknown'
    let version = 'x.x.x'
    if (fs.existsSync('/etc/calamares/settings.conf')) {
        installer = 'calamares'
    }
    const settings = yaml.load(fs.readFileSync('/etc/' + installer + '/settings.conf', 'utf-8')) as unknown as ISettings
    const branding = settings.branding
    const calamares = yaml.load(fs.readFileSync('/etc/' + installer + '/branding/' + branding + '/branding.desc', 'utf-8')) as unknown as IBranding
    productName = calamares.strings.productName
    version = calamares.strings.version

    /**
    * totale width=74
    * step width=15
    * finestra with=59
    */

    return (
        <>
            <Title title={productName} />
            <Box width={74} height={11} borderStyle="round" flexDirection="column">

                <Box flexDirection="column">
                    <Box flexDirection="row">
                        <Steps step={2} />
                        <Box flexDirection="column">
                            <Box><Text>Select your timezone</Text></Box>
                            <Box><Text>Area: </Text><Text color="cyan">{region} </Text></Box>
                            <Box><Text>Zone: </Text><Text color="cyan">{zone}</Text></Box>
                            <Newline />
                            <Box><Text>Language: </Text><Text color="cyan">{language}</Text></Box>
                            <Box><Text>Locale date/numbers: </Text><Text color="cyan">{language}</Text></Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </>
    )
}