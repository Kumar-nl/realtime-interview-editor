import React, { useState, useEffect, useRef } from "react";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";

import Client from "../components/Client";
import Editor from "../components/Editor";
import {initSocket}  from "../socket";
const ACTIONS = require("../Actions");

const EditorPage = () => {
  const [clients, setClients] = useState([]);
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error ", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }
      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // Listening for JOINED event
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ allClients, username, socketId }) => {
          console.log("Clients: ", allClients);
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
            console.log(`${username} joined!`);
          }
          setClients(allClients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId
          });
        }
      );

      // Listening for disconnected
      socketRef.current.on(ACTIONS.DISCONNECTED, ({socketId, username}) => {
        toast.success(`${username} left the room.`)
        setClients((prev) => {
          return prev.filter(client => client.socketId !== socketId);
        })
      })

    };

    init();

    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED)
      socketRef.current.off(ACTIONS.DISCONNECTED)
    }
  }, []);

  if (!location.state) {
    return <Navigate to="/" />;
  }

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID has been copied');
    } catch (err) {
      toast.error('Could not copy the Room Id')
      console.log(err);
    }
  }

  async function leaveRoom() {
    reactNavigator('/');
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick= {copyRoomId}>Copy Room ID</button>
        <button className="btn leaveBtn" onClick= {leaveRoom}>Leave</button>
      </div>
      <div className="editorWrap">
        <Editor socketRef={socketRef} roomId={roomId} onCodeChange={(code) => {codeRef.current = code;}} />
      </div>
    </div>
  );
};

export default EditorPage;
