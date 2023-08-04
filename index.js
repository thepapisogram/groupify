const main = () => {

    // Clear Workspace and reset counter values
    $('#workspace').empty();
    $('#group_no').html('No');
    $('#member_no').html('0');

    // Get names from html input and split by new line
    const get_members = $('#input-items').val();

    // End program if names input is empty
    if(get_members == null || get_members == '') return 0;

    const members = get_members.split('\n');

    
    // Get members per group from html input
    const members_per_group = $('#input-no').value;

    // End program if members per group input is empty
    if (members_per_group == null || members_per_group == '') return 0;

    const number_of_groups = Math.floor(members.length / members_per_group);
    const calc_members = members_per_group * number_of_groups;

    // Update html information on members number
    $('#member_no').html(members_per_group);
    // Update html information on groups number
    $('#group_no').html(number_of_groups)

    // If all groups can have same number of members then
    if (calc_members == members.length) {
        for (i = 1; i <= number_of_groups; i++) {
            let max_members_to_add = members_per_group;
            let cur_list_html = ``;
            for (n = 0; n < max_members_to_add; n++) {
                let random_name = members[Math.floor(Math.random() * members.length)];
                cur_list_html += `<li>${random_name}</li>`;
                let index_of_random = members.indexOf(random_name);
                if (index_of_random > -1) {
                    members.splice(index_of_random, 1);
                }
            }
            addToHTML(i, cur_list_html);
        }
    }/* If groups cannot have same number of members */ else {
        for (i = 1; i <= number_of_groups + 1; i++) {
            let max_members_to_add = members_per_group;
            let cur_list_html = ``;
            for (n = 0; n < max_members_to_add; n++) {
                if (i == number_of_groups + 1) {
                    if (members.length == 0) {
                        break;
                    }
                }
                let random_name = members[Math.floor(Math.random() * members.length)];
                cur_list_html += `<li>${random_name}</li>`;
                let index_of_random = members.indexOf(random_name);
                if (index_of_random > -1) {
                    members.splice(index_of_random, 1);
                }
            }
            addToHTML(i, cur_list_html);
        }
    }

}

// Function to add result to html
const addToHTML = (number, list) => {
    let new_element = `
            <div>
                <h1>Group ${number}</h1>
                <ol>
                    ${list}
                </ol>
            </div>
        `;
    document.getElementById('workspace').innerHTML += new_element;
}