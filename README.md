# Google Analytics Tracking Automatic Testing

This repository contains a script, `check_ga_tracking.js`, that automates testing of Google Analytics tracking on a website using browser automation. This script simulates user interactions and validates that the appropriate tracking events are being sent to Google Analytics.

## Table of Contents

- [Google Analytics Tracking Automatic Testing](#google-analytics-tracking-automatic-testing)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)

## Requirements

- [Node.js](https://nodejs.org/) (version 12+ recommended)
- A website with Google Analytics and Google Tag Manager properly installed and configured
- A testing plan that defines the objectives, test scenarios, and expected outcomes for each test case

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install the required dependencies:

```bash
npm install
```

## Configuration

1. Update the `config.json` file with the appropriate settings for your website, including the URL, user interactions to be tested, and the expected Google Analytics events.

You can find a template config in the repository.

## Usage

To run the `check_ga_tracking.js` script, use the following command:

```bash
node check_ga_tracking.js
```

This will execute the script, simulating the defined user interactions on your website, and validating that the correct tracking events are being sent to Google Analytics. If there are any discrepancies or issues, the script will output them in the console.

The results are saved as a JSON and CSV files.

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-branch`)
3. Commit your changes (`git commit -am 'Add a new feature'`)
4. Push to the branch (`git push origin feature-branch`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.