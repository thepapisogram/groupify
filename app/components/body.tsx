"use client";
import { useState, useRef } from "react";
import Alert from "./alert";
import Modal from "./modal";

const Body = () => {
    
  const [alert, setAlert] = useState(false);
  const [alertText, setAlertText] = useState("Enter Names to group");

  const showAlert = () => {
    setAlert(true);
    setTimeout(() => {
      setAlert(false);
    }, 2000); // Hide alert after 2 seconds
  };

  const [groupList, setGroupList] = useState("");
  const [groupSize, setGroupSize] = useState(1);


  const [batches, setBatches] = useState<string[][]>([]);

  const createGroups = () => {
    let AllMembers = groupList.split("\n");

    // Shuffle Members
    for (let i = AllMembers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [AllMembers[i], AllMembers[j]] = [AllMembers[j], AllMembers[i]];
    }
    
    // Check if groups will have equal no. of members
    let no_of_members = AllMembers.length % groupSize;
    let equalMembers = no_of_members === 0;

    if(equalMembers){
        const batches = [];
        const no_of_batches = AllMembers.length / groupSize;

        for (let i = 0; i < no_of_batches; i++) {
            const start = i * groupSize;
            const end = start + groupSize;
            const batch = AllMembers.slice(start, end);

            if (batch.length === groupSize) {
                batches.push(batch);
            }
        }

        setBatches(batches);
        console.log(batches)
    }else{
        const no_of_batches = Math.floor(AllMembers.length / groupSize);
        const batches = [];
        let extraMembers = AllMembers.length % groupSize;

        // Form initial groups
        for (let i = 0; i < no_of_batches; i++) {
          const start = i * groupSize;
          const end = start + groupSize;
          batches.push(AllMembers.slice(start, end));
        }

        // Distribute extra members to each batch in round-robin
        let extraIndex = no_of_batches * groupSize;
        for (let i = 0; i < extraMembers; i++) {
          batches[i % no_of_batches].push(AllMembers[extraIndex + i]);
        }

        setBatches(batches);
        console.log(batches)
    }
  };

  const modalRef = useRef(null);
  const openModal = () => {
    if(groupList !== ''){
        if(modalRef.current){ modalRef.current.showModal(); createGroups(); }
    }else showAlert();
  }

  return (
    <section className="grid bg-white dark:bg-slate-800 my-2 md:my-5 lg:my-10 md:rounded-lg shadow-lg p-5 w-full md:w-9/12 lg:w-7/12 xl:w-5/12 h-max gap-y-4">
      <textarea
        className="bg-white dark:bg-slate-900 text-stone-900 dark:text-zinc-200 w-full border border-slate-300 dark:border-slate-600 outline-none rounded-lg p-3 resize-none h-40"
        placeholder="Enter Names Here"
        value={groupList}
        onChange={(e) => setGroupList(e.target.value)}
      ></textarea>
      <div className="grid grid-cols-2 items-center pl-3">
        <p className="text-stone-900 dark:text-zinc-300">No. of Members</p>
        <input
          className="bg-white dark:bg-slate-900 text-stone-900 dark:text-zinc-200 w-full border border-slate-300 dark:border-slate-600 outline-none rounded-lg p-3"
          type="number"
          placeholder="Group Size"
          min={1}
          value={groupSize}
          onChange={(e) => setGroupSize(Number(e.target.value))}
        />
      </div>
      <button
        onClick={openModal}
        className="bg-slate-500 dark:bg-teal-800 text-white dark:text-zinc-200 border border-slate-600 dark:border-teal-900 py-2 rounded-lg mt-3 hover:bg-slate-600 dark:hover:bg-teal-900 transition-colors"
      >
        Generate Groups
      </button>

      <Alert show={alert} text={alertText} />
      <Modal batches={batches} ref={modalRef} />
    </section>
  );
};

export default Body;
