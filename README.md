# SmartSpend

A web application for managing bills, expenses, and warranties.

## Technologies Used

*   React
*   TypeScript
*   Vite
*   Tailwind CSS
*   Node.js
*   Express
*   MongoDB

## Setup Instructions

1.  Clone the repository:

    ```bash
    git clone <repository_url>
    ```
2.  Install the client-side dependencies:

    ```bash
    cd client
    npm install
    ```
3.  Install the server-side dependencies:

    ```bash
    cd ../server
    npm install
    ```
4.  Create a `.env` file in the `server` directory with the following environment variables:

    ```
    PORT=<port_number>
    MONGODB_URI=<mongodb_connection_string>
    JWT_SECRET=<jwt_secret>
    ```

5.  Start the client-side development server:

    ```bash
    cd client
    npm run dev
    ```

6.  Start the server-side development server:

    ```bash
    cd ../server
    npm start
    ```

## Usage

1.  Open the application in your browser at `http://localhost:<port_number>`.
2.  Create an account or log in.
3.  Start managing your bills, expenses, and warranties.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](LICENSE)