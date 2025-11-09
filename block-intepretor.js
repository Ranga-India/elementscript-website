// --- ELEMENT GETTERS ---
const editor = document.getElementById('editor');
const runButton = document.getElementById('run-btn');
const clearButton = document.getElementById('clear-btn');
const outputPanel = document.getElementById('output-panel');

// --- INTERPRETER LOGIC ---

/**
 * Maps color names to hex codes (using Tailwind 500/600 palette)
 * @param {string} colorName - The color name from the script.
 * @returns {string | null}
 */
function mapColorToHex(colorName) {
    const colors = {
        "red": "#EF4444",
        "orange": "#F97316",
        "yellow": "#EAB308",
        "green": "#22C55E",
        "blue": "#3B82F6",
        "violet": "#8B5CF6",
        "purple": "#8B5CF6",
        "magenta": "#EC4899",
        "pink": "#EC4899",
        "brown": "#78350F", // (amber-900)
        "gray": "#6B7280",
        "grey": "#6B7280"
    };
    return colors[colorName.toLowerCase()] || null;
}

/**
 * Parses a single command string (like "block.size-2.color-red.repeat-5").
 * @param {string} commandStr - A single command.
 * @returns {object | null}
 */
function parseCommand(commandStr) {
    const trimmedCommand = commandStr.trim();
    
    // Ignore empty strings that might result from splitting
    if (trimmedCommand === "") {
        return null;
    }
    
    // Ignore comments
    if (trimmedCommand.startsWith('#')) {
        return null;
    }

    // Handle 'space-n' command
    if (trimmedCommand.startsWith('space-')) {
        const parts = trimmedCommand.split('-');
        if (parts.length === 2 && parts[0] === 'space') {
            const val = parseFloat(parts[1]);
            if (!isNaN(val) && val > 0) {
                return { command: 'space', size: val };
            } else {
                return { command: 'error', message: `Invalid space value: "${parts[1]}"` };
            }
        }
        // Fall through to generic "Unknown command" if format is wrong, e.g. "space-foo-bar"
    }

    const parts = trimmedCommand.split('.');
    const command = parts[0];

    // Handle 'end' (newline) command
    if (command === 'end') {
        return { command: 'newline' };
    }

    // Handle 'block' command
    if (command === 'block') {
        const props = {
            command: 'block',
            size: 1, // Default size
            color: '#60A5FA', // Default color (blue-400)
            repeat: 1 // Default repeat count
        };

        // Parse properties like ".size-5.color-red.repeat-10"
        for (const propString of parts.slice(1)) {
            const propParts = propString.split('-');
            if (propParts.length !== 2) {
                return { command: 'error', message: `Invalid property syntax: ".${propString}"` };
            }
            
            const propName = propParts[0];
            const propValue = propParts[1];

            if (propName === 'size') {
                const val = parseFloat(propValue);
                if (!isNaN(val) && val > 0) {
                    props.size = val;
                } else {
                    return { command: 'error', message: `Invalid size value: "${propValue}"` };
                }
            } else if (propName === 'color') {
                const hex = mapColorToHex(propValue);
                if (hex) {
                    props.color = hex;
                } else {
                    return { command: 'error', message: `Unknown color: "${propValue}"` };
                }
            } else if (propName === 'repeat') {
                const val = parseInt(propValue, 10);
                if (!isNaN(val) && val > 0) {
                    props.repeat = val;
                } else {
                    return { command: 'error', message: `Invalid repeat value: "${propValue}"` };
                }
            } else {
                return { command: 'error', message: `Unknown property: "${propName}"` };
            }
        }
        return props;
    }

    return { command: 'error', message: `Unknown command: "${command}"` };
}

/**
 * Renders a 'block' element in the output panel.
 * @param {object} props - The properties object from parseCommand.
 */
function renderBlock(props) {
    // We use `rem` for scalable web units.
    // 1rem = 16px. A base size of 2rem = 32px.
    const baseSizeRem = 2;
    const finalSize = props.size * baseSizeRem;

    const square = document.createElement('div');
    square.style.width = `${finalSize}rem`;
    square.style.height = `${finalSize}rem`;
    square.style.backgroundColor = props.color; // Use parsed color
    square.style.margin = '0'; // No margin for attached blocks
    
    // Create a dynamic title for the tooltip
    let title = `block.size-${props.size}.color-${props.color}`;
    if (props.repeat > 1) {
         title += `.repeat-${props.repeat}`;
    }
    square.title = title;
    
    outputPanel.appendChild(square);
}

/**
 * Renders an error message in the output panel.
 * @param {string} message - The error message to display.
 */
function renderError(message) {
    const errorEl = document.createElement('div');
    errorEl.textContent = message;
    errorEl.className = 'w-full text-red-400 p-2 font-mono text-sm';
    outputPanel.appendChild(errorEl);
}

/**
 * Renders a line break in the output panel.
 */
function renderNewline() {
    const newlineEl = document.createElement('div');
    // This 'w-full' element will force a line break in the flex-wrap container
    newlineEl.className = 'w-full'; 
    // No height for fully attached blocks
    outputPanel.appendChild(newlineEl);
}

function renderSpace(props) {
    // We use a base size of 0.5rem (8px).
    // A 'space-4' will be 2rem (32px), matching a default block.
    const baseSizeRem = 0.5;
    const finalSize = props.size * baseSizeRem;

    const spacer = document.createElement('div');
    spacer.style.width = `${finalSize}rem`;
    spacer.style.height = 'auto'; // Spacer only needs width
    spacer.style.flexShrink = '0'; // Prevent spacer from collapsing
    spacer.title = `space-${props.size}`; // Tooltip
    
    outputPanel.appendChild(spacer);
}


/**
 * Runs the interpreter on the code in the editor.
 */
function runCode() {
    // 1. Clear previous output
    outputPanel.innerHTML = '';
    
    // 2. Get code from editor
    const code = editor.value;
    const lines = code.split('\n');

    // 3. Parse and render each line
    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip comments and empty lines
        if (trimmedLine.startsWith('#') || trimmedLine === "") {
            continue;
        }

        // Split the line by spaces to get multiple commands
        const commands = trimmedLine.split(' ').filter(Boolean);

        for (const commandStr of commands) {
            const parsedCmd = parseCommand(commandStr);

            if (parsedCmd) {
                if (parsedCmd.command === 'block') {
                    // Handle the 'repeat' property
                    const repeatCount = parsedCmd.repeat;
                    for (let i = 0; i < repeatCount; i++) {
                        renderBlock(parsedCmd);
                    }
                } else if (parsedCmd.command === 'error') {
                    renderError(parsedCmd.message);
                } else if (parsedCmd.command === 'newline') {
                    renderNewline();
                }
                else if (parsedCmd.command === 'space') {
                    renderSpace(parsedCmd);
                }
            }
        }
    }
}

// --- EVENT LISTENERS ---
runButton.addEventListener('click', runCode);
clearButton.addEventListener('click', () => {
    outputPanel.innerHTML = '';
    // editor.value = '';
});

// Add a default example to the editor
editor.value = `# block adds a block. 
# color-blue makes block blue.
# space-4 gives 4 spaces.
# repeat-6 repeats the block 6 times
# end takes you to next line
                    
block.color-blue space-4 block.color-blue space-2 block.color-red.repeat-3 end
block.color-blue space-4 block.color-blue space-6 block.color-red end
block.color-blue.repeat-3 space-6 block.color-red end
block.color-blue space-4 block.color-blue space-6 block.color-red end
block.color-blue space-4 block.color-blue space-2 block.color-red.repeat-3 end

`;

// Run the default code on page load
runCode();